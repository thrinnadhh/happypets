function getRedisConfig(): { token: string; url: string } | null {
  const url = (Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "").trim();
  const token = (Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "").trim();

  if (!url || !token) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), token };
}

async function callRedis(path: string, body?: unknown): Promise<Response | null> {
  const config = getRedisConfig();
  if (!config) {
    return null;
  }

  try {
    return await fetch(`${config.url}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const response = await callRedis(`get/${encodeURIComponent(key)}`);
  if (!response?.ok) {
    return null;
  }

  try {
    const payload = await response.json() as { result?: string | null };
    if (!payload.result) {
      return null;
    }

    return JSON.parse(payload.result) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const response = await callRedis("set", [key, JSON.stringify(value), "EX", Math.max(1, Math.trunc(ttlSeconds))]);
  if (!response?.ok) {
    return;
  }
}

export function buildCacheKey(scope: string, parts: Array<string | number | boolean | null | undefined>): string {
  const normalizedParts = parts.map((part) => String(part ?? ""));
  return `${scope}:${normalizedParts.join(":")}`;
}
