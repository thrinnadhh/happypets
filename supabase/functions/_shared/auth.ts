import { HttpError } from "./cors.ts";

type AuthenticatedUser = {
  id: string;
  role: string;
};

type JwtHeader = {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
};

type JwtPayload = Record<string, unknown>;

type JwkKey = {
  alg?: string;
  crv?: string;
  kid?: string;
  kty?: string;
  use?: string;
  x?: string;
  y?: string;
};

let jwksCache:
  | {
      expiresAt: number;
      keys: JwkKey[];
    }
  | null = null;

function base64UrlToBase64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}

function decodeBase64UrlJson<T>(value: string): T | null {
  try {
    const normalized = base64UrlToBase64(value);
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as T;
  } catch {
    return null;
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = base64UrlToBase64(value);
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  return decodeBase64UrlJson<Record<string, unknown>>(parts[1]);
}

function joseSignatureToDer(signature: Uint8Array): Uint8Array {
  if (signature.length !== 64) {
    return signature;
  }

  const trimLeadingZeros = (segment: Uint8Array): Uint8Array => {
    let start = 0;
    while (start < segment.length - 1 && segment[start] === 0) {
      start += 1;
    }

    let value = segment.slice(start);
    if (value[0]! & 0x80) {
      const prefixed = new Uint8Array(value.length + 1);
      prefixed[0] = 0;
      prefixed.set(value, 1);
      value = prefixed;
    }

    return value;
  };

  const left = trimLeadingZeros(signature.slice(0, 32));
  const right = trimLeadingZeros(signature.slice(32));
  const totalLength = 2 + left.length + 2 + right.length;
  const der = new Uint8Array(2 + totalLength);
  let offset = 0;

  der[offset++] = 0x30;
  der[offset++] = totalLength;
  der[offset++] = 0x02;
  der[offset++] = left.length;
  der.set(left, offset);
  offset += left.length;
  der[offset++] = 0x02;
  der[offset++] = right.length;
  der.set(right, offset);

  return der;
}

async function getSupabaseJwks(): Promise<JwkKey[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) {
    return jwksCache.keys;
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  if (!supabaseUrl) {
    throw new HttpError(500, "Authentication is temporarily unavailable.", { expose: false });
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
  if (!response.ok) {
    throw new HttpError(500, "Authentication is temporarily unavailable.", { expose: false });
  }

  const payload = await response.json() as { keys?: JwkKey[] };
  const keys = Array.isArray(payload.keys) ? payload.keys : [];
  jwksCache = {
    expiresAt: Date.now() + 60 * 60 * 1000,
    keys,
  };

  return keys;
}

async function verifyJwtSignature(token: string): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new HttpError(401, "Unauthorized");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson<JwtHeader>(encodedHeader);
  const payload = decodeBase64UrlJson<JwtPayload>(encodedPayload);

  if (!header || !payload || header.alg !== "ES256" || typeof header.kid !== "string" || !header.kid) {
    throw new HttpError(401, "Unauthorized");
  }

  const keys = await getSupabaseJwks();
  const jwk = keys.find((candidate) =>
    candidate.kid === header.kid &&
    candidate.kty === "EC" &&
    candidate.crv === "P-256" &&
    candidate.x &&
    candidate.y
  );

  if (!jwk) {
    throw new HttpError(401, "Unauthorized");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    {
      alg: "ES256",
      crv: "P-256",
      ext: true,
      key_ops: ["verify"],
      kid: jwk.kid,
      kty: "EC",
      use: "sig",
      x: jwk.x,
      y: jwk.y,
    },
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["verify"],
  );

  const signingInput = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signatureBytes = base64UrlToBytes(encodedSignature);
  let verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    signatureBytes,
    signingInput,
  );

  if (!verified) {
    verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      joseSignatureToDer(signatureBytes),
      signingInput,
    );
  }

  if (!verified) {
    throw new HttpError(401, "Unauthorized");
  }

  return payload;
}

export function getAuthenticatedUserFromRequest(request: Request): AuthenticatedUser {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized");
  }

  const token = authorization.slice(7).trim();
  const payload = decodeJwtPayload(token);
  const userId = typeof payload?.sub === "string" ? payload.sub.trim() : "";
  const role = typeof payload?.role === "string" ? payload.role.trim() : "";

  if (!userId || !role) {
    throw new HttpError(401, "Unauthorized");
  }

  return {
    id: userId,
    role,
  };
}

export async function getVerifiedAuthenticatedUserFromRequest(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized");
  }

  const token = authorization.slice(7).trim();
  const payload = await verifyJwtSignature(token);
  const userId = typeof payload.sub === "string" ? payload.sub.trim() : "";
  const role = typeof payload.role === "string" ? payload.role.trim() : "";
  const issuer = typeof payload.iss === "string" ? payload.iss.trim() : "";
  const expiry = typeof payload.exp === "number" ? payload.exp : Number(payload.exp);
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const expectedIssuer = `${supabaseUrl}/auth/v1`;

  if (!userId || role !== "authenticated" || !issuer || issuer !== expectedIssuer) {
    throw new HttpError(401, "Unauthorized");
  }

  if (!Number.isFinite(expiry) || expiry * 1000 <= Date.now()) {
    throw new HttpError(401, "Unauthorized");
  }

  return {
    id: userId,
    role,
  };
}
