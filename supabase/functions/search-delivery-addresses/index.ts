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
import { sanitizeAddressText, searchTomTomAddresses } from "../_shared/delivery.ts";

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
    }) as { query?: unknown };
    const query = sanitizeAddressText(body.query ?? "", "Address query");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await enforceRateLimit(adminClient, {
      scopeKey: `delivery:search:${user.id}`,
      action: "search_delivery_addresses",
      maxRequests: 40,
      windowSeconds: 300,
    });

    const suggestions = await searchTomTomAddresses(query, { limit: 5, typeahead: true });

    return withCors(request, jsonResponse({ suggestions }));
  } catch (issue) {
    logInternalError("search-delivery-addresses", issue);
    const status = isHttpError(issue) ? issue.status : 500;
    const message = isHttpError(issue) && issue.expose
      ? issue.message
      : "Unable to search addresses right now.";
    return withCors(request, jsonResponse({ error: message }, status));
  }
});
