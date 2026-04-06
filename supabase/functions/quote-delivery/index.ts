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
  buildCartSignature,
  calculateDeliveryFeeInr,
  calculateRouteWithTomTom,
  fetchEligibleShopIdsForCart,
  fetchSelectedCartRows,
  fetchShopDeliveryConfig,
  geocodeAddressWithTomTom,
  persistDeliveryQuote,
  sanitizeAddressText,
  sanitizeOptionalCoordinate,
} from "../_shared/delivery.ts";

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
    }) as { address?: unknown; destinationLat?: unknown; destinationLng?: unknown };
    const address = sanitizeAddressText(body.address ?? "", "Delivery address");
    const destinationLat = sanitizeOptionalCoordinate(body.destinationLat, "Destination latitude");
    const destinationLng = sanitizeOptionalCoordinate(body.destinationLng, "Destination longitude");

    if ((destinationLat === null) !== (destinationLng === null)) {
      throw new HttpError(400, "Both destination coordinates are required together.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await enforceRateLimit(adminClient, {
      scopeKey: `delivery:quote:${user.id}`,
      action: "quote_delivery",
      maxRequests: 20,
      windowSeconds: 300,
    });

    const cartRows = await fetchSelectedCartRows(adminClient, user.id);
    const cartSignature = buildCartSignature(cartRows);
    const destination =
      destinationLat !== null && destinationLng !== null
        ? {
            id: `${destinationLat},${destinationLng}`,
            address,
            secondaryText: "",
            city: "",
            pincode: "",
            latitude: destinationLat,
            longitude: destinationLng,
          }
        : await geocodeAddressWithTomTom(address);
    const eligibleShopIds = await fetchEligibleShopIdsForCart(adminClient, cartRows);
    let selectedQuote:
      | {
          shopId: string;
          route: { distanceMeters: number; durationSeconds: number };
          deliveryFeeInr: number;
        }
      | null = null;

    for (const shopId of eligibleShopIds) {
      try {
        const config = await fetchShopDeliveryConfig(adminClient, shopId);
        const route = await calculateRouteWithTomTom(
          config.originLat,
          config.originLng,
          destination.latitude,
          destination.longitude,
        );

        if (route.distanceMeters > config.maxServiceDistanceKm * 1000) {
          continue;
        }

        const deliveryFeeInr = calculateDeliveryFeeInr(config, route.distanceMeters);
        if (
          !selectedQuote ||
          route.distanceMeters < selectedQuote.route.distanceMeters ||
          (route.distanceMeters === selectedQuote.route.distanceMeters &&
            route.durationSeconds < selectedQuote.route.durationSeconds)
        ) {
          selectedQuote = {
            shopId,
            route,
            deliveryFeeInr,
          };
        }
      } catch (issue) {
        if (issue instanceof HttpError && issue.status < 500) {
          continue;
        }

        throw issue;
      }
    }

    if (!selectedQuote) {
      throw new HttpError(400, "No nearby shop can deliver all selected items to this address right now.");
    }

    const quote = await persistDeliveryQuote(adminClient, {
      userId: user.id,
      shopId: selectedQuote.shopId,
      cartSignature,
      destinationAddress: destination.address,
      destinationLat: destination.latitude,
      destinationLng: destination.longitude,
      distanceMeters: selectedQuote.route.distanceMeters,
      durationSeconds: selectedQuote.route.durationSeconds,
      deliveryFeeInr: selectedQuote.deliveryFeeInr,
    });

    return withCors(request, jsonResponse({
      deliveryQuoteId: quote.id,
      shopId: quote.shopId,
      normalizedAddress: quote.destinationAddress,
      destinationLat: quote.destinationLat,
      destinationLng: quote.destinationLng,
      distanceMeters: quote.distanceMeters,
      durationSeconds: quote.durationSeconds,
      deliveryFeeInr: quote.deliveryFeeInr,
      serviceable: quote.serviceable,
      expiresAt: quote.expiresAt,
    }));
  } catch (issue) {
    logInternalError("quote-delivery", issue);
    const status = isHttpError(issue) ? issue.status : 500;
    const message = isHttpError(issue) && issue.expose
      ? issue.message
      : "Unable to calculate the delivery fee right now.";
    return withCors(request, jsonResponse({ error: message }, status));
  }
});
