/**
 * Product Reviews API
 * GET: Fetch reviews for a product
 * POST: Submit a new review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reviewSchema } from '@happypets/shared';
import { rateLimit } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:reviews');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const supabase = createClient();
    
    const { data: reviews, error } = await supabase
      .from('product_reviews')
      .select('*, profiles(full_name, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Reviews query error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews', code: 'FETCH_ERROR' }, { status: 500 });
    }

    return NextResponse.json(reviews || []);
  } catch (error) {
    logger.error('Error in GET /api/products/[id]/reviews:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const productId = params.id;
    const body = await request.json();
    const validatedData = reviewSchema.parse({ ...body, product_id: productId });

    const supabase = createClient();

    // Check if user has already reviewed this product
    const { data: existing, error: checkError } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('user_id', user.user_id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this product', code: 'ALREADY_REVIEWED' }, { status: 400 });
    }

    // Check if user has purchased the product (simplified check)
    const { data: purchase, error: purchaseError } = await supabase
      .from('order_items')
      .select('id, orders!inner(user_id, status)')
      .eq('product_id', productId)
      .eq('orders.user_id', user.user_id)
      .eq('orders.status', 'delivered')
      .maybeSingle();

    const verifiedPurchase = !!purchase;

    const { data: review, error: insertError } = await supabase
      .from('product_reviews')
      .insert({
        ...validatedData,
        user_id: user.user_id,
        verified_purchase: verifiedPurchase,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Review insertion error:', insertError);
      return NextResponse.json({ error: 'Failed to submit review', code: 'INSERT_ERROR' }, { status: 500 });
    }

    // Update product average rating
    try {
      await supabase.rpc('update_product_rating', { p_product_id: productId });
    } catch (e) {
      logger.warn('Failed to update product rating rating:', e);
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/products/[id]/reviews:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
