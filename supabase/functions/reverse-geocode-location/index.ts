import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  assertAllowedOrigin,
  assertPostRequest,
  getCorsHeaders,
  HttpError,
  logInternalError,
} from "../_shared/cors.ts";
import { getVerifiedAuthenticatedUserFromRequest } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { reverseGeocodeCoordinates, sanitizeOptionalCoordinate } from "../_shared/delivery.ts";

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

    const user = await getVerifiedAuthenticatedUserFromRequest(request);
    const body = await request.json().catch(() => {
      throw new HttpError(400, "Invalid request body.");
    }) as { lat?: unknown; lng?: unknown };
    const lat = sanitizeOptionalCoordinate(body.lat, "Latitude");
    const lng = sanitizeOptionalCoordinate(body.lng, "Longitude");

    if (lat === null || lng === null) {
      throw new HttpError(400, "Latitude and longitude are required.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await enforceRateLimit(adminClient, {
      scopeKey: `delivery:reverse-geocode:${user.id}`,
      action: "reverse_geocode_location",
      maxRequests: 30,
      windowSeconds: 300,
    });

    const result = await reverseGeocodeCoordinates(lat, lng);
    return withCors(request, jsonResponse(result));
  } catch (issue) {
    logInternalError("reverse-geocode-location", issue);
    const status = isHttpError(issue) ? issue.status : 500;
    const message = isHttpError(issue) && issue.expose
      ? issue.message
      : "Unable to identify that map location right now.";
    return withCors(request, jsonResponse({ error: message }, status));
  }
});
