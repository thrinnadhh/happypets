/**
 * Categories API
 * GET: Fetch distinct categories with product counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCacheValue, setCacheValue, rateLimit } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:categories');

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 100, 60);

    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMIT' }, { status: 429 });
    }

    const cacheKey = 'categories:list';
    const cached = await getCacheValue<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const supabase = createClient();
    
    // In a real database, we would have a categories table,
    // but here we might need to count from products or use a view
    const { data: categories, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true)
      .eq('published', true);

    if (error) {
      logger.error('Categories fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch categories', code: 'FETCH_ERROR' }, { status: 500 });
    }

    // Process and count
    const counts: Record<string, number> = {};
    (categories || []).forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const result = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      slug: name.toLowerCase().replace(/_/g, '-'),
    }));

    await setCacheValue(cacheKey, result, 3600); // 1 hour cache

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in GET /api/categories:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
