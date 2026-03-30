/**
 * Featured Products API Route
 * GET: Public, cached featured products for home page
 * PATCH: Admin/Editor, bulk manage featured products
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@happypets/shared';
import { rateLimit, cacheClient } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:featured-products');
const CACHE_KEY = 'products:featured';

/**
 * GET /api/products/featured
 * Fetch only featured products
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 500, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Check Redis cache first
    const cachedData = await cacheClient.get(CACHE_KEY);
    if (cachedData) {
      logger.debug('Cache hit for featured products');
      return NextResponse.json(JSON.parse(cachedData as string));
    }

    const supabase = createClient();
    
    // Fetch from Supabase
    const { data: featured, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        short_description,
        price,
        image_urls,
        featured_image_url,
        rating,
        featured_order,
        brands (name, slug),
        category:categories (name, emoji)
      `)
      .eq('is_featured', true)
      .eq('is_active', true)
      .eq('published', true)
      .order('featured_order', { ascending: true })
      .limit(10); // Limit to top 10 for performance

    if (error) {
      logger.error('Failed to fetch featured products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch featured products', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Cache the result for 15 minutes
    await cacheClient.set(CACHE_KEY, JSON.stringify(featured), { ex: 900 });

    return NextResponse.json(featured);
  } catch (error) {
    logger.error('Error in GET /api/products/featured:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/featured
 * Manage featured products list (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Only Admin or Superadmin can manage featured products
    if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { product_id, is_featured, featured_order } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: 'Product ID is required', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Update product featured status
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        is_featured,
        featured_order: featured_order || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id)
      .select('id, name, is_featured, featured_order')
      .single();

    if (error) {
      logger.error('Failed to update featured status:', error);
      return NextResponse.json(
        { error: 'Failed to update featured status', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Bust the featured products cache
    await cacheClient.del(CACHE_KEY);
    
    // Log change
    logger.info(`Featured status updated for product ${product_id}: ${is_featured} by ${user.user_id}`);

    return NextResponse.json({
      success: true,
      product: updated
    });
  } catch (error) {
    logger.error('Error in PATCH /api/products/featured:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
