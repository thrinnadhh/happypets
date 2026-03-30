/**
 * Brand Detail API Route
 * GET: Public, cached brand details
 * PATCH: Admin only, update brand
 * DELETE: Admin only, soft delete brand
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { brandSchema, UserRole } from '@happypets/shared';
import { rateLimit, cacheClient } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:brand-detail');
const CACHE_PREFIX = 'brands:id:';

/**
 * GET /api/brands/[id]
 * Fetch single brand by ID or Slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const cacheKey = `${CACHE_PREFIX}${id}`;

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
    const cached = await cacheClient.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for brand: ${cacheKey}`);
      return NextResponse.json(JSON.parse(cached as string));
    }

    const supabase = createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Fetch brand
    let query = supabase
      .from('brands')
      .select('*')
      .eq('is_active', true);

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: brand, error } = await query.single();

    if (error || !brand) {
      return NextResponse.json(
        { error: 'Brand not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Cache the brand details for 30 minutes
    await cacheClient.set(cacheKey, JSON.stringify(brand), { ex: 1800 });
    
    // If fetched by slug, also cache by ID
    if (!isUuid) {
      await cacheClient.set(`${CACHE_PREFIX}${brand.id}`, JSON.stringify(brand), { ex: 1800 });
    } else {
      await cacheClient.set(`${CACHE_PREFIX}${brand.slug}`, JSON.stringify(brand), { ex: 1800 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    logger.error(`Error in GET /api/brands/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/brands/[id]
 * Update brand details (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication
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

    const id = params.id;
    const body = await request.json();
    const validatedData = brandSchema.partial().parse(body);

    const supabase = createClient();

    // Check if brand exists
    const { data: existing, error: fetchError } = await supabase
      .from('brands')
      .select('id, slug')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Brand not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Update brand
    const { data: updated, error: updateError } = await supabase
      .from('brands')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error('Brand update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update brand', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Bust cache
    await cacheClient.del(`${CACHE_PREFIX}${id}`);
    await cacheClient.del(`${CACHE_PREFIX}${existing.slug}`);
    
    // Also bust listing cache
    const listKeys = await cacheClient.keys('brands:list:*');
    if (listKeys.length > 0) {
      await cacheClient.del(...listKeys);
    }

    logger.info(`Brand updated: ${id} by ${user.user_id}`);
    return NextResponse.json(updated);
  } catch (error) {
    logger.error(`Error in PATCH /api/brands/${params.id}:`, error);

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
 * DELETE /api/brands/[id]
 * Soft delete brand (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication
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

    const id = params.id;
    const supabase = createClient();

    // Fetch to get slug
    const { data: existing, error: fetchError } = await supabase
      .from('brands')
      .select('id, slug')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Brand not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('brands')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      logger.error('Brand delete failed:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete brand', code: 'DELETE_ERROR' },
        { status: 500 }
      );
    }

    // Bust cache
    await cacheClient.del(`${CACHE_PREFIX}${id}`);
    await cacheClient.del(`${CACHE_PREFIX}${existing.slug}`);
    
    // Also bust listing cache
    const listKeys = await cacheClient.keys('brands:list:*');
    if (listKeys.length > 0) {
      await cacheClient.del(...listKeys);
    }

    logger.info(`Brand deleted: ${id} by ${user.user_id}`);
    return NextResponse.json({ success: true, message: 'Brand soft deleted' });
  } catch (error) {
    logger.error(`Error in DELETE /api/brands/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
