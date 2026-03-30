/**
 * Wishlist API
 * GET: Fetch user's wishlist
 * POST: Toggle product in wishlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:wishlist');

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 50, 60);

    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMIT' }, { status: 429 });
    }

    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const supabase = createClient();
    const { data: wishlist, error } = await supabase
      .from('wishlist')
      .select('*, products(*)')
      .eq('user_id', user.user_id);

    if (error) {
      logger.error('Wishlist fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch wishlist', code: 'FETCH_ERROR' }, { status: 500 });
    }

    return NextResponse.json(wishlist || []);
  } catch (error) {
    logger.error('Error in GET /api/wishlist:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const supabase = createClient();

    // Check if product exists in wishlist
    const { data: existing, error: checkError } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', user.user_id)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      logger.error('Wishlist check error:', checkError);
      return NextResponse.json({ error: 'Wishlist update failed', code: 'UPDATE_ERROR' }, { status: 500 });
    }

    if (existing) {
      // Remove from wishlist
      const { error: deleteError } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        logger.error('Wishlist delete error:', deleteError);
        return NextResponse.json({ error: 'Failed to remove from wishlist', code: 'DELETE_ERROR' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Add to wishlist
      const { data: product } = await supabase.from('products').select('id').eq('id', productId).single();
      if (!product) return NextResponse.json({ error: 'Product not found', code: 'NOT_FOUND' }, { status: 404 });

      const { error: insertError } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.user_id,
          product_id: productId,
          added_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error('Wishlist insert error:', insertError);
        return NextResponse.json({ error: 'Failed to add to wishlist', code: 'INSERT_ERROR' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'added' }, { status: 201 });
    }
  } catch (error) {
    logger.error('Error in POST /api/wishlist:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
