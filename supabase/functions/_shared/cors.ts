const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3004",
  "http://127.0.0.1:3004",
];

function getConfiguredOrigins(): string[] {
  const configuredOrigins = [
    Deno.env.get("ALLOWED_ORIGINS"),
    Deno.env.get("FRONTEND_URL"),
    Deno.env.get("NEXT_PUBLIC_APP_URL"),
    Deno.env.get("SITE_URL"),
  ]
    .filter(Boolean)
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const vercelUrl = Deno.env.get("VERCEL_URL");
  if (vercelUrl?.trim()) {
    configuredOrigins.push(`https://${vercelUrl.trim()}`);
  }

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];
}

export class HttpError extends Error {
  status: number;
  expose: boolean;

  constructor(status: number, message: string, options?: { expose?: boolean }) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.expose = options?.expose ?? status < 500;
  }
}

export function getCorsHeaders(request: Request, methods = "POST, OPTIONS"): Record<string, string> {
  const allowedOrigins = getConfiguredOrigins();
  const origin = request.headers.get("origin")?.trim() ?? "";
  const matchedOrigin = allowedOrigins.includes(origin) ? origin : "";

  return {
    ...(matchedOrigin ? { "Access-Control-Allow-Origin": matchedOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) {
    return;
  }

  if (!getConfiguredOrigins().includes(origin)) {
    throw new HttpError(403, "Origin not allowed.");
  }
}

export function assertPostRequest(request: Request): void {
  if (request.method !== "POST") {
    throw new HttpError(405, "Method not allowed.");
  }
}

export function logInternalError(scope: string, issue: unknown): void {
  console.error(`[${scope}]`, issue);
}

export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}
