/**
 * Browse Shops API Route
 * GET: Public lookup of shops with filters and sorting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, cacheClient } from '@/lib/redis';
import { hashObject } from '@/lib/utils';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:shops-browse');
const CACHE_PREFIX = 'shops:browse:';

/**
 * GET /api/shops/browse
 * Browse and search for shops
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 100, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const sort = searchParams.get('sort') || 'rating';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    // Cache key
    const cacheKey = { search, city, category, sort, page, limit };
    const cacheHash = hashObject(cacheKey);
    const fullCacheKey = `${CACHE_PREFIX}${cacheHash}`;

    // Check cache
    const cached = await cacheClient.get(fullCacheKey);
    if (cached) {
      logger.debug(`Cache hit for shops browse: ${fullCacheKey}`);
      return NextResponse.json(JSON.parse(cached as string));
    }

    const supabase = createClient();
    
    // Build query
    let query = supabase
      .from('shops')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .eq('status', 'APPROVED');

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    if (city) {
      query = query.eq('city', city);
    }

    // Sort order
    if (sort === 'rating') {
      query = query.order('rating', { ascending: false });
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('name', { ascending: true });
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: shops, count, error } = await query;

    if (error) {
      logger.error('Supabase query error for shops browse:', error);
      return NextResponse.json(
        { error: 'Failed to browse shops', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    const response = {
      shops: shops || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };

    // Cache for 10 minutes
    await cacheClient.set(fullCacheKey, JSON.stringify(response), { ex: 600 });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in GET /api/shops/browse:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
