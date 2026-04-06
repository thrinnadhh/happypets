import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, HttpError, logInternalError, timingSafeEqual } from "../_shared/cors.ts";

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

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed.");
    }

    const rawBody = await request.text();
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
    const receivedSignature = request.headers.get("X-Razorpay-Signature") ?? "";

    if (!webhookSecret || !receivedSignature) {
      throw new HttpError(400, "Missing webhook secret or signature.");
    }

    const expectedSignature = await hmacHex(webhookSecret, rawBody);
    if (!timingSafeEqual(expectedSignature, receivedSignature)) {
      throw new HttpError(400, "Invalid webhook signature.");
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event as string;
    const paymentEntity = payload.payload?.payment?.entity;
    const refundEntity = payload.payload?.refund?.entity;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (paymentEntity?.id) {
      if (event === "payment.captured") {
        await adminClient
          .from("orders")
          .update({
            payment_status: "paid",
            status: "confirmed",
            razorpay_payment_id: paymentEntity.id,
            razorpay_order_id: paymentEntity.order_id,
          })
          .eq("razorpay_order_id", paymentEntity.order_id);
      }

      if (event === "payment.authorized") {
        await adminClient
          .from("orders")
          .update({
            payment_status: "pending",
            status: "pending",
            razorpay_payment_id: paymentEntity.id,
            razorpay_order_id: paymentEntity.order_id,
          })
          .eq("razorpay_order_id", paymentEntity.order_id);
      }

      if (event === "payment.failed") {
        await adminClient
          .from("orders")
          .update({
            payment_status: "failed",
            status: "cancelled",
          })
          .eq("razorpay_order_id", paymentEntity.order_id);
      }
    }

    if (refundEntity?.payment_id && event === "refund.processed") {
      await adminClient
        .from("orders")
        .update({
          payment_status: "refunded",
          status: "cancelled",
        })
        .eq("razorpay_payment_id", refundEntity.payment_id);
    }

    return withCors(request, jsonResponse({ ok: true, event }));
  } catch (issue) {
    logInternalError("razorpay-webhook", issue);
    const status = issue instanceof HttpError ? issue.status : 400;
    const message = issue instanceof HttpError && issue.expose
      ? issue.message
      : "Webhook processing failed.";
    return withCors(request, jsonResponse({ error: message }, status));
  }
});
