/**
 * Advanced Search API
 * GET: Search products with multi-field matching and suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getCacheValue, setCacheValue } from '@/lib/redis';
import { getLogger } from '@/lib/logger';
import { hashObject } from '@/lib/utils';

const logger = getLogger('api:search');

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 100, 60);

    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMIT' }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

    if (!query && !category) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const cacheKey = `search:${hashObject({ query, category, limit, page })}`;
    const cached = await getCacheValue<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const supabase = createClient();
    let supabaseQuery = supabase
      .from('products')
      .select('*, brands(name, logo_url), shops(name, display_name)', { count: 'exact' })
      .eq('is_active', true)
      .eq('published', true);

    if (query) {
      const searchTerm = `%${query}%`;
      supabaseQuery = supabaseQuery.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},tags.cs.{${query}}`);
    }

    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category);
    }

    const offset = (page - 1) * limit;
    const { data: products, count, error } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('rating', { ascending: false });

    if (error) {
      logger.error('Search query error:', error);
      return NextResponse.json({ error: 'Search failed', code: 'SEARCH_ERROR' }, { status: 500 });
    }

    const result = {
      items: products || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };

    await setCacheValue(cacheKey, result, 600); // 10 minutes cache

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in GET /api/search:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
