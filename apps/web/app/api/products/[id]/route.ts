/**
 * Product Detail API Route
 * GET: Public, cached product info
 * PATCH: Admin/Editor, update product
 * DELETE: Admin, soft delete product
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productSchema } from '@happypets/shared';
import { UserRole, UserStatus } from '@happypets/shared';
import { rateLimit, getCachedProduct, setCachedProduct, bustProductCache } from '@/lib/redis';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:product-detail');

/**
 * GET /api/products/[id]
 * Fetch single product by ID or Slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 200, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Check cache
    const cached = await getCachedProduct<any>(id);
    if (cached) {
      logger.debug(`Cache hit for product: ${id}`);
      return NextResponse.json(cached);
    }

    const supabase = createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Fetch product
    let query = supabase
      .from('products')
      .select(`
        *,
        brands (id, name, slug, logo_url),
        category:categories (id, name, emoji, color),
        shop:shops (id, name, slug, display_name)
      `)
      .eq('is_active', true);

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: product, error } = await query.single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Cache if it's published
    if (product.published) {
      await setCachedProduct(id, product, 600); // 10 minutes
      if (!isUuid) {
        await setCachedProduct(product.id, product, 600); // Also cache by ID
      } else {
        await setCachedProduct(product.slug, product, 600); // Also cache by Slug
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    logger.error(`Error in GET /api/products/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Update product (admin/editor)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const supabase = createClient();
    
    // Check if product exists and if user has access
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('id, shop_id, featured_image_url, image_urls')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check permissions
    if (user.role === UserRole.ADMIN) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('shop_id')
        .eq('user_id', user.user_id)
        .single();
        
      if (!profile || profile.shop_id !== existing.shop_id) {
        return NextResponse.json(
          { error: 'Access denied', code: 'ACCESS_DENIED' },
          { status: 403 }
        );
      }
    }

    // Data validation
    const body = await request.json();
    const validatedData = productSchema.partial().parse(body);

    // Update product
    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update product', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Bust cache
    await bustProductCache(id);
    await bustProductCache(updated.slug);

    logger.info(`Product updated: ${id} by ${user.user_id}`);
    return NextResponse.json(updated);
  } catch (error) {
    logger.error(`Error in PATCH /api/products/${params.id}:`, error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Soft delete product (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const supabase = createClient();
    
    // Fetch product to get shop ID and images
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('id, slug, shop_id, image_urls')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check permissions
    if (user.role === UserRole.ADMIN) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('shop_id')
        .eq('user_id', user.user_id)
        .single();
        
      if (!profile || profile.shop_id !== existing.shop_id) {
        return NextResponse.json(
          { error: 'Access denied', code: 'ACCESS_DENIED' },
          { status: 403 }
        );
      }
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('products')
      .update({
        is_active: false,
        published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      logger.error('Delete failed:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete product', code: 'DELETE_ERROR' },
        { status: 500 }
      );
    }

    // Bust cache
    await bustProductCache(id);
    await bustProductCache(existing.slug);

    logger.info(`Product deleted: ${id} by ${user.user_id}`);
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    logger.error(`Error in DELETE /api/products/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
