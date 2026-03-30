/**
 * Admin Inventory API
 * GET: Fetch inventory for filtered Admin/SuperAdmin
 * PATCH: Bulk update stock and price
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole, StockStatus } from '@happypets/shared';
import { rateLimit, bustProductCacheForShop } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:admin:inventory');

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 50, 60);

    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMIT' }, { status: 429 });
    }

    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shop') || (user.role === UserRole.ADMIN ? user.shop_id : undefined);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const supabase = createClient();
    let query = supabase.from('products').select('*', { count: 'exact' });

    if (shopId) query = query.eq('shop_id', shopId);
    if (category) query = query.eq('category', category);
    
    if (status) {
      if (status === StockStatus.OUT_OF_STOCK) query = query.eq('stock_quantity', 0);
      else if (status === StockStatus.LOW_STOCK) query = query.gt('stock_quantity', 0).lt('stock_quantity', 10);
      else if (status === StockStatus.IN_STOCK) query = query.gte('stock_quantity', 10);
    }

    if (search) query = query.ilike('name', `%${search}%`);

    const { data: products, count, error } = await query.order('stock_quantity', { ascending: true });

    if (error) {
      logger.error('Inventory query error:', error);
      return NextResponse.json({ error: 'Failed to fetch inventory', code: 'FETCH_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ products: products || [], total: count || 0 });
  } catch (error) {
    logger.error('Error in GET /api/admin/inventory:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body; // Array of { id, stock_quantity, price }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Invalid updates', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const supabase = createClient();
    let updatedCount = 0;

    for (const update of updates) {
      const { id, stock_quantity, price } = update;
      
      const updateData: any = { updated_at: new Date().toISOString() };
      if (typeof stock_quantity === 'number') updateData.stock_quantity = stock_quantity;
      if (typeof price === 'number') updateData.price = price;

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .eq('shop_id', user.role === UserRole.ADMIN ? user.shop_id : updateData.shop_id || id); // Admin can only update their own shop products

      if (!error) updatedCount++;
    }

    if (user.role === UserRole.ADMIN && user.shop_id) {
      await bustProductCacheForShop(user.shop_id);
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    logger.error('Error in PATCH /api/admin/inventory:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
