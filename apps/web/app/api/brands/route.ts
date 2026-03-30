/**
 * Brands API Route
 * GET: Public, cached brands list
 * POST: Admin only, create brand
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { brandSchema, UserRole } from '@happypets/shared';
import { rateLimit, cacheClient } from '@/lib/redis';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { generateSlug, hashObject } from '@/lib/utils';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:brands');
const CACHE_PREFIX = 'brands:list:';

/**
 * GET /api/brands
 * Fetch all brands with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 300, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));

    // Cache key
    const cacheKey = { search, category, page, limit };
    const cacheHash = hashObject(cacheKey);
    const fullCacheKey = `${CACHE_PREFIX}${cacheHash}`;

    // Check cache
    const cached = await cacheClient.get(fullCacheKey);
    if (cached) {
      logger.debug(`Cache hit for brands list: ${fullCacheKey}`);
      return NextResponse.json(JSON.parse(cached as string));
    }

    const supabase = createClient();
    
    // Build query
    let query = supabase
      .from('brands')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1).order('name');

    const { data: brands, count, error } = await query;

    if (error) {
      logger.error('Supabase query error for brands:', error);
      return NextResponse.json(
        { error: 'Failed to fetch brands', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    const response = {
      brands: brands || [],
      total: count || 0,
      page,
      limit,
    };

    // Cache the response
    await cacheClient.set(fullCacheKey, JSON.stringify(response), { ex: 600 });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in GET /api/brands:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brands
 * Create new brand (Admin only)
 */
export async function POST(request: NextRequest) {
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

    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = brandSchema.parse(body);

    // Slug generation and uniqueness check
    const baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let counter = 2;

    const supabase = createClient();

    while (true) {
      const { data, error } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Handle logo upload if provided as base64
    let logoUrl = validatedData.logo_url;
    if (body.logoBase64) {
      try {
        logoUrl = await uploadToCloudinary(body.logoBase64, `brands/${slug}`);
      } catch (uploadError) {
        logger.error('Brand logo upload failed:', uploadError);
        return NextResponse.json(
          { error: 'Logo upload failed', code: 'UPLOAD_ERROR' },
          { status: 400 }
        );
      }
    }

    // Create brand
    const { data: brand, error: insertError } = await supabase
      .from('brands')
      .insert({
        ...validatedData,
        slug,
        logo_url: logoUrl,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Brand creation failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to create brand', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    // Bust brand listing cache
    const keys = await cacheClient.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await cacheClient.del(...keys);
    }

    logger.info(`Brand created: ${brand.id} by ${user.user_id}`);

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/brands:', error);

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
