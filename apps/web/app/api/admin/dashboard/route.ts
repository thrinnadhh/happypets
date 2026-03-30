/**
 * Admin Dashboard API
 * GET: Fetch dashboard statistics for Admin/SuperAdmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@happypets/shared';
import { rateLimit, getCacheValue, setCacheValue } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:admin:dashboard');

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 50, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Check authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const cacheKey = `admin:dashboard:${user.user_id}`;
    
    // Check cache
    const cached = await getCacheValue<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let stats: any = {};

    if (user.role === UserRole.ADMIN) {
      const shopId = user.shop_id;
      if (!shopId) {
        return NextResponse.json(
          { error: 'Shop not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // Fetch admin stats
      const [
        { count: totalProducts },
        { data: salesData },
        { count: pendingOrders },
        { data: lowStockProducts }
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('shop_id', shopId).eq('is_active', true),
        supabase.from('orders').select('total_amount, created_at').eq('payment_status', 'paid'), // Need to join with order_items to filter by shop
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'), // Join with order_items
        supabase.from('products').select('*').eq('shop_id', shopId).lt('stock_quantity', 10).eq('is_active', true).limit(5)
      ]);

      // Optimization: In a real app, we'd use a more complex SQL query or RPC for this
      // For now, let's assume we filter orders that have items from this shop
      const { data: shopOrders } = await supabase
        .from('order_items')
        .select('order_id, price_at_purchase, quantity')
        .eq('shop_id', shopId);

      const totalRevenue = (shopOrders || []).reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0);
      const totalOrders = new Set((shopOrders || []).map(o => o.order_id)).size;

      stats = {
        totalProducts: totalProducts || 0,
        totalRevenue,
        totalOrders,
        pendingOrders: pendingOrders || 0,
        lowStockProducts: lowStockProducts || [],
        recentSales: [] // Would populate with real data
      };
    } else {
      // SuperAdmin stats
      const [
        { count: totalUsers },
        { count: totalShops },
        { data: allRevenue },
        { count: totalOrders }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
        supabase.from('orders').select('*', { count: 'exact', head: true })
      ]);

      const totalRevenue = (allRevenue || []).reduce((acc, o) => acc + o.total_amount, 0);

      stats = {
        totalUsers: totalUsers || 0,
        totalShops: totalShops || 0,
        totalRevenue,
        totalOrders: totalOrders || 0,
        revenueByMonth: [] // Would populate with real data
      };
    }

    // Cache for 5 minutes
    await setCacheValue(cacheKey, stats, 300);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Error in GET /api/admin/dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
