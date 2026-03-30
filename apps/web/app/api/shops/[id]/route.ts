/**
 * Shop Detail API Route
 * GET: Public lookup of a specific shop by ID or Slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, cacheClient } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:shop-detail');
const CACHE_PREFIX = 'shops:id:';

/**
 * GET /api/shops/[id]
 * Fetch single shop details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idOrSlug = params.id;
    const cacheKey = `${CACHE_PREFIX}${idOrSlug}`;

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
      logger.debug(`Cache hit for shop: ${idOrSlug}`);
      return NextResponse.json(JSON.parse(cached as string));
    }

    const supabase = createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    // Fetch shop details
    let query = supabase
      .from('shops')
      .select('*')
      .eq('is_active', true);

    if (isUuid) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data: shop, error } = await query.single();

    if (error || !shop) {
      return NextResponse.json(
        { error: 'Shop not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Cache the shop details for 30 minutes
    await cacheClient.set(cacheKey, JSON.stringify(shop), { ex: 1800 });
    
    // If by slug, also cache by ID
    if (!isUuid) {
      await cacheClient.set(`${CACHE_PREFIX}${shop.id}`, JSON.stringify(shop), { ex: 1800 });
    } else {
      await cacheClient.set(`${CACHE_PREFIX}${shop.slug}`, JSON.stringify(shop), { ex: 1800 });
    }

    return NextResponse.json(shop);
  } catch (error) {
    logger.error(`Error in GET /api/shops/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
