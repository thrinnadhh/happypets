import { HttpError } from "./cors.ts";

type MinimalAdminClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
        };
      };
    };
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error: { message?: string } | null }>;
  };
};

export async function enforceRateLimit(
  adminClient: MinimalAdminClient,
  options: {
    scopeKey: string;
    action: string;
    maxRequests: number;
    windowSeconds: number;
  },
): Promise<void> {
  const now = new Date();
  const { scopeKey, action, maxRequests, windowSeconds } = options;

  const { data, error } = await adminClient
    .from("security_rate_limits")
    .select("request_count, window_started_at")
    .eq("scope_key", scopeKey)
    .eq("action", action)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Unable to enforce request limits.");
  }

  const windowStartedAt = data?.window_started_at ? new Date(String(data.window_started_at)) : null;
  const withinWindow = Boolean(windowStartedAt && now.getTime() - windowStartedAt.getTime() < windowSeconds * 1000);
  const requestCount = Number(data?.request_count ?? 0);

  if (withinWindow && requestCount >= maxRequests) {
    throw new HttpError(429, "Too many requests. Please try again shortly.");
  }

  const nextCount = withinWindow ? requestCount + 1 : 1;
  const nextWindowStartedAt = withinWindow && windowStartedAt ? windowStartedAt.toISOString() : now.toISOString();

  const { error: upsertError } = await adminClient.from("security_rate_limits").upsert(
    {
      scope_key: scopeKey,
      action,
      request_count: nextCount,
      window_started_at: nextWindowStartedAt,
      updated_at: now.toISOString(),
    },
    { onConflict: "scope_key,action" },
  );

  if (upsertError) {
    throw new Error(upsertError.message ?? "Unable to persist request limits.");
  }
}
