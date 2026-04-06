import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertAllowedOrigin,
  assertPostRequest,
  getCorsHeaders,
  HttpError,
  logInternalError,
  timingSafeEqual,
} from "../_shared/cors.ts";
import { getAuthenticatedUserFromRequest } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import {
  assertShopCanFulfillCart,
  buildCartSignature,
  calculateCartSubtotal,
  calculateDiscountedPrice,
  fetchSelectedCartRows,
  getCartProduct,
  loadValidatedDeliveryQuote,
} from "../_shared/delivery.ts";

type CheckoutPayload = {
  address: string;
  city: string;
  pincode: string;
  mobileNumber: string;
  deliveryTime: string;
  deliveryQuoteId: string;
  destinationLat: number;
  destinationLng: number;
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
      "Content-Type": "application/json",
    },
  });
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(getCorsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isHttpError(issue: unknown): issue is HttpError {
  return issue instanceof HttpError;
}

function isMissingProductEnhancementColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return message.includes("is_sample");
}

function isMissingAddressCoordinateColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return message.includes("latitude") || message.includes("longitude");
}

function buildOrderNumber(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HPT-${date}-${suffix}`;
}

function validateCheckoutPayload(checkout: CheckoutPayload): void {
  if (!checkout.address.trim()) {
    throw new HttpError(400, "Delivery address is required.");
  }

  if (!checkout.city.trim()) {
    throw new HttpError(400, "City is required.");
  }

  if (!/^\d{6}$/.test(checkout.pincode.trim())) {
    throw new HttpError(400, "Pincode must be exactly 6 digits.");
  }

  if (!/^\d{10}$/.test(checkout.mobileNumber.trim())) {
    throw new HttpError(400, "Mobile number must be exactly 10 digits.");
  }

  const deliveryDate = new Date(checkout.deliveryTime);
  if (!checkout.deliveryTime || Number.isNaN(deliveryDate.getTime()) || deliveryDate.getTime() <= Date.now()) {
    throw new HttpError(400, "Delivery time must be in the future.");
  }

  if (!checkout.deliveryQuoteId.trim()) {
    throw new HttpError(400, "Delivery quote is required.");
  }

  if (!Number.isFinite(checkout.destinationLat) || !Number.isFinite(checkout.destinationLng)) {
    throw new HttpError(400, "Delivery coordinates are invalid.");
  }
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

function validateVerificationPayload(payload: {
  razorpay_order_id: unknown;
  razorpay_payment_id: unknown;
  razorpay_signature: unknown;
}): asserts payload is {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
} {
  if (
    typeof payload.razorpay_order_id !== "string" ||
    typeof payload.razorpay_payment_id !== "string" ||
    typeof payload.razorpay_signature !== "string"
  ) {
    throw new HttpError(400, "Missing Razorpay verification payload.");
  }

  if (!/^order_[A-Za-z0-9]+$/.test(payload.razorpay_order_id)) {
    throw new HttpError(400, "Invalid Razorpay order reference.");
  }

  if (!/^pay_[A-Za-z0-9]+$/.test(payload.razorpay_payment_id)) {
    throw new HttpError(400, "Invalid Razorpay payment reference.");
  }

  if (!/^[a-fA-F0-9]{64}$/.test(payload.razorpay_signature)) {
    throw new HttpError(400, "Invalid Razorpay signature.");
  }
}

function sanitizeCouponCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (!/^[A-Z0-9_-]{3,32}$/.test(normalized)) {
    throw new HttpError(400, "Coupon code format is invalid.");
  }

  return normalized;
}

async function fetchOrderWithItems(
  adminClient: ReturnType<typeof createClient>,
  orderId: string,
): Promise<unknown> {
  const attempt = async (selectClause: string) => {
    const { data, error } = await adminClient
      .from("orders")
      .select(selectClause)
      .eq("id", orderId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  try {
    return await attempt(`
      id,
      order_number,
      status,
      payment_status,
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
    `);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw issue;
    }

    return attempt(`
      id,
      order_number,
      status,
      payment_status,
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
        product:products(images)
      )
    `);
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
    throw new HttpError(400, "Coupon minimum order value not met.");
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
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  try {
    assertAllowedOrigin(request);
    assertPostRequest(request);

    const user = getAuthenticatedUserFromRequest(request);
    const body = await request.json().catch(() => {
      throw new HttpError(400, "Invalid request body.");
    }) as {
      razorpay_order_id: unknown;
      razorpay_payment_id: unknown;
      razorpay_signature: unknown;
      checkout: CheckoutPayload;
      couponCode?: unknown;
    };

    validateVerificationPayload(body);

    if (!body.checkout || typeof body.checkout !== "object") {
      throw new HttpError(400, "Checkout details are required.");
    }

    validateCheckoutPayload(body.checkout);
    const couponCode = sanitizeCouponCode(body.couponCode ?? null);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, checkout } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId =
      Deno.env.get("NEXT_PUBLIC_RAZORPAY_KEY_ID") ?? Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    if (!razorpayKeyId || !razorpaySecret) {
      throw new HttpError(500, "Payment verification is temporarily unavailable.", { expose: false });
    }

    const expectedSignature = await hmacHex(
      razorpaySecret,
      `${razorpay_order_id}|${razorpay_payment_id}`,
    );

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await enforceRateLimit(adminClient, {
      scopeKey: `payment:verify:${user.id}`,
      action: "verify_razorpay_payment",
      maxRequests: 20,
      windowSeconds: 300,
    });

    if (!timingSafeEqual(expectedSignature, razorpay_signature)) {
      throw new HttpError(400, "Invalid Razorpay signature.");
    }

    const { data: existingOrder } = await adminClient
      .from("orders")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingOrder?.id) {
      const existingOrderWithItems = await fetchOrderWithItems(adminClient, existingOrder.id);
      return withCors(request, jsonResponse({ order: existingOrderWithItems }));
    }

    const auth = btoa(`${razorpayKeyId}:${razorpaySecret}`);
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!paymentResponse.ok) {
      throw new HttpError(502, "Unable to confirm the payment with the provider.", { expose: false });
    }

    const payment = await paymentResponse.json() as {
      order_id?: string;
      status?: string;
      method?: string;
      amount?: number;
    };

    if (payment.order_id !== razorpay_order_id) {
      throw new HttpError(400, "Payment order mismatch.");
    }

    if (payment.status !== "captured") {
      if (payment.status === "authorized") {
        throw new HttpError(409, "Payment is authorized but not captured yet.");
      }

      throw new HttpError(400, `Payment status is ${payment.status}, not completed.`);
    }

    const cartRows = await fetchSelectedCartRows(adminClient, user.id);
    const cartSignature = buildCartSignature(cartRows);
    const subtotal = calculateCartSubtotal(cartRows);
    const coupon = await resolveCoupon(adminClient, couponCode, subtotal);
    const discountAmount = coupon?.discountAmount ?? 0;
    const deliveryQuote = await loadValidatedDeliveryQuote(adminClient, {
      deliveryQuoteId: checkout.deliveryQuoteId,
      userId: user.id,
      cartSignature,
      allowExpired: true,
    });
    await assertShopCanFulfillCart(adminClient, cartRows, deliveryQuote.shopId);
    const total = Math.max(subtotal - discountAmount + deliveryQuote.deliveryFeeInr, 0);
    const expectedAmountPaise = Math.round(total * 100);

    if (Number(payment.amount ?? 0) !== expectedAmountPaise) {
      throw new HttpError(400, "Payment amount does not match the latest delivery quote.");
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const insertAddress = async (includeCoordinates: boolean) => {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        label: "Delivery",
        full_name: profile?.full_name ?? "HappyPets Customer",
        phone: checkout.mobileNumber,
        address_line1: deliveryQuote.destinationAddress,
        city: checkout.city.trim(),
        state: "NA",
        pincode: checkout.pincode.trim(),
        is_default: false,
      };

      if (includeCoordinates) {
        payload.latitude = checkout.destinationLat;
        payload.longitude = checkout.destinationLng;
      }

      return adminClient
        .from("addresses")
        .insert(payload)
        .select("id")
        .single();
    };

    let addressResult = await insertAddress(true);
    if (addressResult.error && isMissingAddressCoordinateColumnError(addressResult.error)) {
      addressResult = await insertAddress(false);
    }

    if (addressResult.error) {
      throw addressResult.error;
    }

    const address = addressResult.data;

    const paymentMethod =
      ["upi", "card", "netbanking", "wallet"].includes(payment.method ?? "") ? payment.method : "card";

    const soldDeltas = new Map<string, { soldCount: number; revenue: number }>();
    cartRows.forEach((row) => {
      const product = getCartProduct(row);
      const current = soldDeltas.get(row.product_id) ?? { soldCount: 0, revenue: 0 };
      const unitPrice = calculateDiscountedPrice(Number(product?.price_inr ?? 0), product?.discount);
      current.soldCount += row.quantity;
      current.revenue += unitPrice * row.quantity;
      soldDeltas.set(row.product_id, current);
    });

    for (const [productId, delta] of soldDeltas.entries()) {
      const { error: stockError } = await adminClient.rpc("decrement_product_shop_stock", {
        p_product_id: productId,
        p_shop_id: deliveryQuote.shopId,
        p_quantity: delta.soldCount,
      });

      if (stockError) {
        throw new HttpError(409, "One of the items just went out of stock before checkout finished.");
      }
    }

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        order_number: buildOrderNumber(),
        user_id: user.id,
        address_id: address.id,
        status: "confirmed",
        subtotal_inr: subtotal,
        gst_amount: 0,
        shipping_inr: deliveryQuote.deliveryFeeInr,
        discount_inr: discountAmount,
        total_inr: total,
        payment_method: paymentMethod,
        payment_status: "paid",
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        delivery_address: deliveryQuote.destinationAddress,
        mobile_number: checkout.mobileNumber,
        delivery_time: checkout.deliveryTime,
        coupon_code: coupon?.code ?? null,
        delivery_fee_inr: deliveryQuote.deliveryFeeInr,
        delivery_distance_meters: deliveryQuote.distanceMeters,
        delivery_duration_seconds: deliveryQuote.durationSeconds,
        delivery_origin_shop_id: deliveryQuote.shopId,
        delivery_quote_snapshot: {
          deliveryQuoteId: deliveryQuote.id,
          destinationAddress: deliveryQuote.destinationAddress,
          destinationLat: deliveryQuote.destinationLat,
          destinationLng: deliveryQuote.destinationLng,
          distanceMeters: deliveryQuote.distanceMeters,
          durationSeconds: deliveryQuote.durationSeconds,
          deliveryFeeInr: deliveryQuote.deliveryFeeInr,
          expiresAt: deliveryQuote.expiresAt,
          checkoutDestinationLat: checkout.destinationLat,
          checkoutDestinationLng: checkout.destinationLng,
        },
      })
      .select("id")
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderItems = cartRows.map((row) => {
      const product = getCartProduct(row);
      const unitPrice = calculateDiscountedPrice(Number(product?.price_inr ?? 0), product?.discount);
      return {
        order_id: order.id,
        product_id: row.product_id,
        shop_id: deliveryQuote.shopId,
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

    const finalOrder = await fetchOrderWithItems(adminClient, order.id);

    return withCors(request, jsonResponse({ order: finalOrder }));
  } catch (issue) {
    logInternalError("verify-razorpay-payment", issue);
    const status = isHttpError(issue) ? issue.status : 500;
    const message = isHttpError(issue) && issue.expose
      ? issue.message
      : "Unable to verify the payment right now.";
    return withCors(request, jsonResponse({ error: message }, status));
  }
});
