import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertAllowedOrigin,
  assertPostRequest,
  getCorsHeaders,
  HttpError,
  logInternalError,
} from "../_shared/cors.ts";
import { getAuthenticatedUserFromRequest } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import {
  assertShopCanFulfillCart,
  buildCartSignature,
  calculateCartSubtotal,
  fetchSelectedCartRows,
  loadValidatedDeliveryQuote,
} from "../_shared/delivery.ts";

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
    headers: { "Content-Type": "application/json" },
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

function sanitizeDeliveryQuoteId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "Delivery quote is required.");
  }

  return value.trim();
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

  let discountAmount = coupon.discount_type === "percentage"
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
    const body = await request.json().catch(() => ({}));
    if (body && typeof body !== "object") {
      throw new HttpError(400, "Invalid request body.");
    }

    const couponCode = sanitizeCouponCode((body as { couponCode?: unknown }).couponCode ?? null);
    const deliveryQuoteId = sanitizeDeliveryQuoteId((body as { deliveryQuoteId?: unknown }).deliveryQuoteId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId =
      Deno.env.get("NEXT_PUBLIC_RAZORPAY_KEY_ID") ?? Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    if (!razorpayKeyId || !razorpaySecret) {
      throw new HttpError(500, "Payment service is temporarily unavailable.", { expose: false });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await enforceRateLimit(adminClient, {
      scopeKey: `payment:create-order:${user.id}`,
      action: "create_razorpay_order",
      maxRequests: 12,
      windowSeconds: 300,
    });

    const cartRows = await fetchSelectedCartRows(adminClient, user.id);
    const cartSignature = buildCartSignature(cartRows);
    const subtotal = calculateCartSubtotal(cartRows);
    const coupon = await resolveCoupon(adminClient, couponCode, subtotal);
    const deliveryQuote = await loadValidatedDeliveryQuote(adminClient, {
      deliveryQuoteId,
      userId: user.id,
      cartSignature,
    });
    await assertShopCanFulfillCart(adminClient, cartRows, deliveryQuote.shopId);

    const total = Math.max(subtotal - (coupon?.discountAmount ?? 0) + deliveryQuote.deliveryFeeInr, 0);
    const amountPaise = Math.round(total * 100);

    const auth = btoa(`${razorpayKeyId}:${razorpaySecret}`);
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `hpt-${Date.now()}`,
        notes: {
          user_id: user.id,
          shop_id: deliveryQuote.shopId,
          coupon_code: coupon?.code ?? "",
          delivery_quote_id: deliveryQuote.id,
          delivery_fee_inr: String(deliveryQuote.deliveryFeeInr),
        },
      }),
    });

    if (!razorpayResponse.ok) {
      throw new HttpError(502, "Unable to start the payment session.", { expose: false });
    }

    const razorpayOrder = await razorpayResponse.json();

    return withCors(request, jsonResponse({
      razorpayOrderId: razorpayOrder.id,
      amountPaise: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: razorpayKeyId,
      deliveryFeeInr: deliveryQuote.deliveryFeeInr,
    }));
  } catch (issue) {
    logInternalError("create-razorpay-order", issue);
    const status = isHttpError(issue) ? issue.status : 500;
    const message = isHttpError(issue) && issue.expose
      ? issue.message
      : "Unable to create the payment session right now.";
    return withCors(request, jsonResponse({ error: message }, status));
  }
});
