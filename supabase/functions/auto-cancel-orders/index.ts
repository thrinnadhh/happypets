// supabase/functions/auto-cancel-orders/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Cancel orders pending for more than 30 minutes with no payment
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: staleOrders, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .eq('payment_status', 'pending')
    .lt('created_at', thirtyMinutesAgo)
    .select('id, order_number');

  if (error) {
    console.error('Auto-cancel error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`Auto-cancelled ${staleOrders?.length ?? 0} stale orders`);

  return new Response(
    JSON.stringify({
      cancelled: staleOrders?.length ?? 0,
      orders: staleOrders?.map(o => o.order_number) ?? [],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
