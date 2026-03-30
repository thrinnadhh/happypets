// apps/web/app/api/webhooks/razorpay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';

// Use service role for webhook processing (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  // Check length first to avoid timingSafeEqual throwing on mismatch
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  // Compare hex-encoded buffers (not UTF-8 byte comparison)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature || !verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = event.event;

  try {
    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        const razorpayOrderId = payment.order_id;

        // Update order status
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            payment_method: mapRazorpayMethod(payment.method),
            razorpay_payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', razorpayOrderId)
          .select('*, items:order_items(*)')
          .single();

        if (orderError || !order) {
          console.error('Order update failed:', orderError);
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Deduct stock for each order item
        for (const item of order.items ?? []) {
          // decrement_product_stock is a custom RPC in Supabase
          await supabase.rpc('decrement_product_stock', {
            p_id: item.product_id,
            p_qty: item.quantity,
          });
        }

        // Fetch user profile for email
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', order.user_id)
          .single();

        if (profile) {
          // Send email directly
          const { sendOrderConfirmation } = await import('@/lib/resend');
          await sendOrderConfirmation(order as any, profile as any);
        }

        // Notify shop admins for each shop involved
        const uniqueShopIds = [...new Set(order.items?.map((i: any) => i.shop_id))];
        for (const shopId of uniqueShopIds) {
          // Logic for real-time notification (e.g. pusher or database notification)
          await supabase.from('notifications').insert({
            user_id: null, // Broadcast or specific shop admin
            type: 'new_order',
            title: 'New Order Received',
            message: `Order #${order.order_number} has been placed.`,
            metadata: { orderId: order.id, shopId }
          });
        }

        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            razorpay_payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', payment.order_id);

        break;
      }

      case 'refund.processed': {
        const refund = event.payload.refund.entity;
        
        // 1. Update order status
        const { data: order } = await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_payment_id', refund.payment_id)
          .select('id, items:order_items(*)')
          .single();

        // 2. Restore stock
        if (order) {
          for (const item of order.items ?? []) {
            await supabase.rpc('increment_product_stock', {
              p_id: item.product_id,
              p_qty: item.quantity,
            });
          }
        }

        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

function mapRazorpayMethod(method: string): string {
  const methodMap: Record<string, string> = {
    upi: 'upi',
    card: 'card',
    netbanking: 'netbanking',
    wallet: 'wallet',
  };
  return methodMap[method] ?? 'card';
}
