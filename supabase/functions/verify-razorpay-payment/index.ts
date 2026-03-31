import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CheckoutPayload = {
  address: string;
  mobileNumber: string;
  deliveryTime: string;
};

type CartRow = {
  id: string;
  product_id: string;
  quantity: number;
  selected?: boolean | null;
  product: {
    name: string;
    images: string[] | null;
    price_inr: number;
    discount: number | null;
    shop_id: string;
    is_sample?: boolean | null;
  } | {
    name: string;
    images: string[] | null;
    price_inr: number;
    discount: number | null;
    shop_id: string;
    is_sample?: boolean | null;
  }[] | null;
};

type CouponRow = {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_inr: number | null;
  max_discount_inr: number | null;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function calculateDiscountedPrice(price: number, discount?: number | null): number {
  if (!discount) return price;
  return Math.max(price - (price * discount) / 100, 0);
}

function buildOrderNumber(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HPT-${date}-${suffix}`;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getCurrentUser(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: request.headers.get("Authorization") ?? "",
      },
    },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return data.user;
}

async function fetchSelectedCart(adminClient: ReturnType<typeof createClient>, userId: string): Promise<CartRow[]> {
  const attempt = async (selectClause: string): Promise<CartRow[]> => {
    const { data, error } = await adminClient
      .from("cart_items")
      .select(selectClause)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return (data ?? []) as CartRow[];
  };

  try {
    const rows = await attempt(
      "id, product_id, quantity, selected, product:products!cart_items_product_id_fkey(name, images, price_inr, discount, shop_id, is_sample)",
    );
    return rows.filter((row) => row.selected ?? true);
  } catch (issue) {
    const message = issue instanceof Error ? issue.message.toLowerCase() : "";
    if (!message.includes("selected")) {
      throw issue;
    }

    return attempt(
      "id, product_id, quantity, product:products!cart_items_product_id_fkey(name, images, price_inr, discount, shop_id, is_sample)",
    );
  }
}

async function resolveCoupon(
  adminClient: ReturnType<typeof createClient>,
  couponCode: string | null,
  subtotal: number,
): Promise<{ code: string; discountAmount: number } | null> {
  if (!couponCode) {
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from("coupons")
    .select("code, discount_type, discount_value, min_order_inr, max_discount_inr")
    .eq("code", couponCode)
    .eq("is_active", true)
    .lte("valid_from", now)
    .gte("valid_until", now)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const coupon = data as CouponRow;
  if (subtotal < Number(coupon.min_order_inr ?? 0)) {
    throw new Error("Coupon minimum order value not met.");
  }

  let discountAmount =
    coupon.discount_type === "percentage"
      ? (subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);

  if (coupon.max_discount_inr) {
    discountAmount = Math.min(discountAmount, Number(coupon.max_discount_inr));
  }

  return {
    code: coupon.code,
    discountAmount: Math.min(discountAmount, subtotal),
  };
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getCurrentUser(request);
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      checkout,
      couponCode,
    } = await request.json() as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      checkout: CheckoutPayload;
      couponCode?: string | null;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing Razorpay verification payload.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId =
      Deno.env.get("NEXT_PUBLIC_RAZORPAY_KEY_ID") ?? Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    if (!razorpayKeyId || !razorpaySecret) {
      throw new Error("Razorpay credentials are not configured.");
    }

    const expectedSignature = await hmacHex(
      razorpaySecret,
      `${razorpay_order_id}|${razorpay_payment_id}`,
    );

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid Razorpay signature.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingOrder } = await adminClient
      .from("orders")
      .select("id, order_number, status, total_inr, delivery_address, mobile_number, delivery_time, created_at")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingOrder) {
      const { data: existingOrderWithItems, error: existingOrderError } = await adminClient
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          total_inr,
          delivery_address,
          mobile_number,
          delivery_time,
          created_at,
          items:order_items(
            product_id,
            product_name,
            quantity,
            unit_price_inr,
            total_inr,
            product:products(images, is_sample)
          )
        `)
        .eq("id", existingOrder.id)
        .single();

      if (existingOrderError) {
        throw existingOrderError;
      }

      return jsonResponse({ order: existingOrderWithItems });
    }

    const auth = btoa(`${razorpayKeyId}:${razorpaySecret}`);
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`Unable to fetch Razorpay payment: ${errorText}`);
    }

    const payment = await paymentResponse.json();
    if (payment.order_id !== razorpay_order_id) {
      throw new Error("Payment order mismatch.");
    }

    if (!["captured", "authorized"].includes(payment.status)) {
      throw new Error(`Payment status is ${payment.status}, not completed.`);
    }

    const cartRows = await fetchSelectedCart(adminClient, user.id);
    if (!cartRows.length) {
      throw new Error("No selected cart items found for checkout.");
    }

    const subtotal = cartRows.reduce((sum, row) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      return sum + calculateDiscountedPrice(Number(product?.price_inr ?? 0), product?.discount) * row.quantity;
    }, 0);
    const coupon = await resolveCoupon(adminClient, couponCode ?? null, subtotal);
    const discountAmount = coupon?.discountAmount ?? 0;
    const total = Math.max(subtotal - discountAmount, 0);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const { data: address, error: addressError } = await adminClient
      .from("addresses")
      .insert({
        user_id: user.id,
        label: "Delivery",
        full_name: profile?.full_name ?? "HappyPets Customer",
        phone: checkout.mobileNumber,
        address_line1: checkout.address,
        city: "NA",
        state: "NA",
        pincode: "000000",
        is_default: false,
      })
      .select("id")
      .single();

    if (addressError) {
      throw addressError;
    }

    const paymentMethod =
      ["upi", "card", "netbanking", "wallet"].includes(payment.method) ? payment.method : "card";

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        order_number: buildOrderNumber(),
        user_id: user.id,
        address_id: address.id,
        status: "confirmed",
        subtotal_inr: subtotal,
        gst_amount: 0,
        shipping_inr: 0,
        discount_inr: discountAmount,
        total_inr: total,
        payment_method: paymentMethod,
        payment_status: "paid",
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        delivery_address: checkout.address,
        mobile_number: checkout.mobileNumber,
        delivery_time: checkout.deliveryTime,
        coupon_code: coupon?.code ?? null,
      })
      .select("id")
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderItems = cartRows.map((row) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      const unitPrice = calculateDiscountedPrice(Number(product?.price_inr ?? 0), product?.discount);
      return {
        order_id: order.id,
        product_id: row.product_id,
        shop_id: product?.shop_id ?? "",
        variant_id: null,
        product_name: product?.name ?? "HappyPets Product",
        variant_name: null,
        quantity: row.quantity,
        unit_price_inr: unitPrice,
        gst_rate: 0,
        total_inr: unitPrice * row.quantity,
        fulfillment_status: "confirmed",
      };
    });

    const { error: orderItemsError } = await adminClient.from("order_items").insert(orderItems);
    if (orderItemsError) {
      throw orderItemsError;
    }

    const soldDeltas = new Map<string, { soldCount: number; revenue: number }>();
    cartRows.forEach((row) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      const current = soldDeltas.get(row.product_id) ?? { soldCount: 0, revenue: 0 };
      const unitPrice = calculateDiscountedPrice(Number(product?.price_inr ?? 0), product?.discount);
      current.soldCount += row.quantity;
      current.revenue += unitPrice * row.quantity;
      soldDeltas.set(row.product_id, current);
    });

    for (const [productId, delta] of soldDeltas.entries()) {
      const { data: existingProduct } = await adminClient
        .from("products")
        .select("sold_count, revenue")
        .eq("id", productId)
        .maybeSingle();

      await adminClient
        .from("products")
        .update({
          sold_count: Number(existingProduct?.sold_count ?? 0) + delta.soldCount,
          revenue: Number(existingProduct?.revenue ?? 0) + delta.revenue,
        })
        .eq("id", productId);
    }

    if (coupon?.code) {
      const { data: couponData } = await adminClient
        .from("coupons")
        .select("used_count")
        .eq("code", coupon.code)
        .maybeSingle();

      await adminClient
        .from("coupons")
        .update({ used_count: Number(couponData?.used_count ?? 0) + 1 })
        .eq("code", coupon.code);
    }

    await adminClient
      .from("cart_items")
      .delete()
      .in("id", cartRows.map((row) => row.id));

    const { data: finalOrder, error: finalOrderError } = await adminClient
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_inr,
        delivery_address,
        mobile_number,
        delivery_time,
        created_at,
        items:order_items(
          product_id,
          product_name,
          quantity,
          unit_price_inr,
          total_inr,
          product:products(images, is_sample)
        )
      `)
      .eq("id", order.id)
      .single();

    if (finalOrderError) {
      throw finalOrderError;
    }

    return jsonResponse({ order: finalOrder });
  } catch (issue) {
    return jsonResponse(
      {
        error: issue instanceof Error ? issue.message : "Unable to verify Razorpay payment.",
      },
      400,
    );
  }
});
