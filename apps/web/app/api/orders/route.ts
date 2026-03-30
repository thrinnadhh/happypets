/**
 * Orders API Route
 * GET: Fetch orders (filtered by role)
 * POST: Create new order (customer only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkoutSchema } from '@happypets/shared';
import type { Order, OrderStatus, Address } from '@happypets/shared';
import { UserRole, UserStatus, OrderStatus as OrderStatusEnum, PaymentStatus } from '@happypets/shared';
import { rateLimit, getCart, clearCart } from '@/lib/redis';
import { formatPrice } from '@happypets/shared/utils';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:orders');

// ============================================================================
// GET /api/orders
// ============================================================================

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

    // Check authentication
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'));
    const status = searchParams.get('status') || undefined;
    const shopId = searchParams.get('shop') || undefined;

    const offset = (page - 1) * limit;
    const supabase = createClient();

    let query = supabase.from('orders').select('*', { count: 'exact' });

    // Role-based filtering
    if (user.role === UserRole.SUPERADMIN) {
      // SuperAdmin sees all orders
      if (status) query = query.eq('status', status);
      if (shopId) {
        // Filter by shop via order_items
        query = query
          .select(`
            *,
            order_items!inner(shop_id)
          `)
          .eq('order_items.shop_id', shopId);
      }
    } else if (user.role === UserRole.ADMIN) {
      // Admin sees orders with items from their shop
      const { data: adminProfile } = await supabase
        .from('user_profiles')
        .select('shop_id')
        .eq('user_id', user.user_id)
        .single();

      if (!adminProfile?.shop_id) {
        return NextResponse.json(
          { error: 'Admin shop not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      query = query
        .select(`
          *,
          order_items!inner(*)
        `)
        .eq('order_items.shop_id', adminProfile.shop_id);

      if (status) query = query.eq('status', status);
    } else {
      // Customer sees only their own orders
      query = query.eq('user_id', user.user_id);
      if (status) query = query.eq('status', status);
    }

    // Pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, count, error } = await query;

    if (error) {
      logger.error('Orders query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      orders: orders || [],
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    logger.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/orders
// ============================================================================

export async function POST(request: NextRequest) {
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

    // Check authentication (customer only)
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user || user.role !== UserRole.CUSTOMER) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse and validate
    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);

    const supabase = createClient();

    // Validate products exist and have stock
    const failedProducts = [];
    let subtotal = 0;

    for (const item of validatedData.cart_items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, discount_percentage, stock_quantity, expiry_date, is_active')
        .eq('id', item.product_id)
        .single();

      if (error || !product) {
        failedProducts.push({
          id: item.product_id,
          issue: 'Product not found',
        });
        continue;
      }

      if (!product.is_active) {
        failedProducts.push({
          id: product.id,
          name: product.name,
          issue: 'Product is no longer available',
        });
        continue;
      }

      if (new Date(product.expiry_date) < new Date()) {
        failedProducts.push({
          id: product.id,
          name: product.name,
          issue: 'Product has expired',
        });
        continue;
      }

      if (product.stock_quantity < item.quantity) {
        failedProducts.push({
          id: product.id,
          name: product.name,
          issue: `Only ${product.stock_quantity} units available`,
        });
        continue;
      }

      // Calculate subtotal
      const itemPrice =
        product.price * (1 - (product.discount_percentage || 0) / 100);
      subtotal += itemPrice * item.quantity;
    }

    if (failedProducts.length > 0) {
      return NextResponse.json(
        { error: 'Some products are unavailable', code: 'VALIDATION_ERROR', failedProducts },
        { status: 400 }
      );
    }

    // Validate coupon if provided
    let discountAmount = 0;

    if (validatedData.coupon_code) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', validatedData.coupon_code.toUpperCase())
        .eq('active', true)
        .single();

      if (couponError || !coupon) {
        return NextResponse.json(
          { error: 'Invalid coupon code', code: 'INVALID_COUPON' },
          { status: 400 }
        );
      }

      // Check expiry
      if (new Date(coupon.valid_until) < new Date()) {
        return NextResponse.json(
          { error: 'Coupon has expired', code: 'COUPON_EXPIRED' },
          { status: 400 }
        );
      }

      // Check min purchase
      if (coupon.min_purchase_amount && subtotal < coupon.min_purchase_amount) {
        return NextResponse.json(
          {
            error: `Minimum purchase of ${formatPrice(coupon.min_purchase_amount)} required`,
            code: 'MIN_PURCHASE_NOT_MET',
          },
          { status: 400 }
        );
      }

      // Calculate discount
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round(subtotal * (coupon.discount_value / 100));
      } else {
        discountAmount = coupon.discount_value;
      }
    }

    // Calculate shipping (free >= ₹499 else ₹49)
    const shippingCost = subtotal >= 49900 ? 0 : 4900; // In paise
    const taxAmount = 0; // Could add GST later
    const totalAmount = subtotal + shippingCost - discountAmount + taxAmount;

    // Create order in transaction
    const orderNumber = `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    // Import Razorpay here to avoid initialization issues
    const { default: razorpay } = await import('@/lib/razorpay');

    // Start database operation
    // We'll use service role for this to ensure consistency across multiple tables
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const adminSupabase = createServiceRoleClient();

    // 1. Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: totalAmount, // already in paise
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          userId: user.user_id,
          customerName: user.full_name,
        },
      });
    } catch (rzpError) {
      logger.error('Razorpay order creation failed:', rzpError);
      return NextResponse.json(
        { error: 'Payment gateway error', code: 'GATEWAY_ERROR' },
        { status: 502 }
      );
    }

    // 2. Insert order into database
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .insert({
        user_id: user.user_id,
        order_number: orderNumber,
        total_amount: totalAmount,
        subtotal: subtotal,
        shipping_cost: shippingCost,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        status: OrderStatusEnum.PENDING,
        payment_status: PaymentStatus.PENDING,
        payment_method: validatedData.payment_method,
        shipping_address: validatedData.shipping_address as any,
        billing_address: (validatedData.billing_address || validatedData.shipping_address) as any,
        razorpay_order_id: razorpayOrder.id,
        coupon_code: validatedData.coupon_code,
        notes: validatedData.notes,
      })
      .select()
      .single();

    if (orderError || !order) {
      logger.error('Order insertion failed:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // 3. Insert order items
    const orderItems = [];
    for (const item of validatedData.cart_items) {
      // Get product details for snapshot
      const { data: product } = await adminSupabase
        .from('products')
        .select('*, brand:brands(name)')
        .eq('id', item.product_id)
        .single();
      
      if (product) {
        const itemPrice = Math.round(product.price * (1 - (product.discount_percentage || 0) / 100));
        
        orderItems.push({
          order_id: order.id,
          product_id: product.id,
          shop_id: product.shop_id,
          quantity: item.quantity,
          price_at_purchase: itemPrice,
          product_snapshot: {
            name: product.name,
            image: product.featured_image_url,
            brand: product.brand?.name,
            sku: product.sku
          }
        });
      }
    }

    const { error: itemsError } = await adminSupabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.error('Order items insertion failed:', itemsError);
      // We should ideally rollback the order here, but for simplicity in MVP:
      // adminSupabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to save order items', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // 4. Clear cart in Redis and DB
    try {
      await clearCart(user.user_id);
      await adminSupabase.from('cart_items').delete().eq('user_id', user.user_id);
    } catch (clearError) {
      logger.warn('Failed to clear cart, continuing anyway:', clearError);
    }

    // 5. Track usage of coupon if applied
    if (validatedData.coupon_code) {
      // Logic to increment coupon usage count would go here
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
      },
      razorpay: {
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      }
    });
  } catch (error) {
    logger.error('Error in POST /api/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
