import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HttpError } from "./cors.ts";

type DeliveryProductRow = {
  name?: string | null;
  images?: string[] | null;
  price_inr: number;
  discount: number | null;
  shop_id: string;
  is_sample?: boolean | null;
};

export type DeliveryCartRow = {
  id: string;
  product_id: string;
  quantity: number;
  selected?: boolean | null;
  product: DeliveryProductRow | DeliveryProductRow[] | null;
};

export type ShopDeliveryConfig = {
  shopId: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  baseFeeInr: number;
  includedDistanceKm: number;
  extraPerKmInr: number;
  maxServiceDistanceKm: number;
  isActive: boolean;
};

export type DeliveryQuoteRecord = {
  id: string;
  userId: string;
  shopId: string;
  cartSignature: string;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceMeters: number;
  durationSeconds: number;
  deliveryFeeInr: number;
  serviceable: boolean;
  expiresAt: string;
};

export type TomTomAddressResult = {
  id: string;
  address: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

type ShopDeliveryConfigRow = {
  shop_id: string;
  origin_address: string;
  origin_lat: number | string;
  origin_lng: number | string;
  base_fee_inr: number | string;
  included_distance_km: number | string;
  extra_per_km_inr: number | string;
  max_service_distance_km: number | string;
  is_active: boolean | null;
};

type DeliveryQuoteRow = {
  id: string;
  user_id: string;
  shop_id: string;
  cart_signature: string;
  destination_address: string;
  destination_lat: number | string;
  destination_lng: number | string;
  distance_meters: number | string;
  duration_seconds: number | string;
  delivery_fee_inr: number | string;
  serviceable: boolean | null;
  expires_at: string;
};

type TomTomSearchApiResponse = {
  results?: Array<{
    id?: string | number;
    address?: {
      freeformAddress?: string;
      municipality?: string;
      countrySubdivision?: string;
    };
    position?: {
      lat?: number;
      lon?: number;
    };
  }>;
};

type TomTomRouteApiResponse = {
  routes?: Array<{
    summary?: {
      lengthInMeters?: number;
      travelTimeInSeconds?: number;
      trafficTimeInSeconds?: number;
    };
  }>;
};

function isMissingColumnError(issue: unknown, columns: string[]): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string"
    ? issue.message.toLowerCase()
    : "";

  return columns.some((column) => message.includes(column.toLowerCase()));
}

function mapQuoteRow(row: DeliveryQuoteRow): DeliveryQuoteRecord {
  return {
    id: row.id,
    userId: row.user_id,
    shopId: row.shop_id,
    cartSignature: row.cart_signature,
    destinationAddress: row.destination_address,
    destinationLat: Number(row.destination_lat),
    destinationLng: Number(row.destination_lng),
    distanceMeters: Number(row.distance_meters),
    durationSeconds: Number(row.duration_seconds),
    deliveryFeeInr: Number(row.delivery_fee_inr),
    serviceable: row.serviceable ?? true,
    expiresAt: row.expires_at,
  };
}

export function getCartProduct(row: DeliveryCartRow): DeliveryProductRow | null {
  return Array.isArray(row.product) ? row.product[0] ?? null : row.product;
}

export function sanitizeAddressText(value: unknown, fieldName = "Address"): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 5) {
    throw new HttpError(400, `${fieldName} must be at least 5 characters long.`);
  }

  return normalized;
}

export function sanitizeOptionalCoordinate(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string"
    ? Number(value.trim())
    : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    throw new HttpError(400, `${fieldName} is invalid.`);
  }

  return numericValue;
}

export function calculateDiscountedPrice(price: number, discount?: number | null): number {
  if (!discount) {
    return price;
  }

  return Math.max(price - (price * discount) / 100, 0);
}

export async function fetchSelectedCartRows(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<DeliveryCartRow[]> {
  const attempt = async (selectClause: string): Promise<DeliveryCartRow[]> => {
    const { data, error } = await adminClient
      .from("cart_items")
      .select(selectClause)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return (data ?? []) as DeliveryCartRow[];
  };

  try {
    const rows = await attempt(
      "id, product_id, quantity, selected, product:products!cart_items_product_id_fkey(name, images, price_inr, discount, shop_id, is_sample)",
    );
    return rows.filter((row) => row.selected ?? true);
  } catch (issue) {
    if (!isMissingColumnError(issue, ["selected", "is_sample"])) {
      throw issue;
    }

    try {
      const rows = await attempt(
        "id, product_id, quantity, selected, product:products!cart_items_product_id_fkey(name, images, price_inr, discount, shop_id)",
      );
      return rows.filter((row) => row.selected ?? true);
    } catch (legacyIssue) {
      if (!isMissingColumnError(legacyIssue, ["selected"])) {
        throw legacyIssue;
      }

      return attempt(
        "id, product_id, quantity, product:products!cart_items_product_id_fkey(name, images, price_inr, discount, shop_id)",
      );
    }
  }
}

export function calculateCartSubtotal(cartRows: DeliveryCartRow[]): number {
  return cartRows.reduce((sum, row) => {
    const product = getCartProduct(row);
    return sum + calculateDiscountedPrice(Number(product?.price_inr ?? 0), product?.discount) * row.quantity;
  }, 0);
}

export function ensureSingleShopCart(cartRows: DeliveryCartRow[]): string {
  if (!cartRows.length) {
    throw new HttpError(400, "No selected cart items found for checkout.");
  }

  const shopIds = new Set<string>();
  for (const row of cartRows) {
    const product = getCartProduct(row);
    if (!product?.shop_id) {
      throw new HttpError(500, "Cart contains an unavailable product.", { expose: false });
    }
    shopIds.add(product.shop_id);
  }

  if (shopIds.size > 1) {
    throw new HttpError(400, "Select items from a single shop before requesting delivery pricing.");
  }

  return Array.from(shopIds)[0]!;
}

export function buildCartSignature(cartRows: DeliveryCartRow[]): string {
  return cartRows
    .map((row) => {
      const product = getCartProduct(row);
      return `${row.id}:${row.product_id}:${product?.shop_id ?? ""}:${row.quantity}`;
    })
    .sort()
    .join("|");
}

export async function fetchShopDeliveryConfig(
  adminClient: ReturnType<typeof createClient>,
  shopId: string,
): Promise<ShopDeliveryConfig> {
  const { data, error } = await adminClient
    .from("shop_delivery_configs")
    .select(
      "shop_id, origin_address, origin_lat, origin_lng, base_fee_inr, included_distance_km, extra_per_km_inr, max_service_distance_km, is_active",
    )
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new HttpError(400, "Delivery pricing is not configured for this shop yet.");
  }

  const config = data as ShopDeliveryConfigRow;
  if (!config.is_active) {
    throw new HttpError(400, "Delivery is currently unavailable for this shop.");
  }

  return {
    shopId: config.shop_id,
    originAddress: config.origin_address,
    originLat: Number(config.origin_lat),
    originLng: Number(config.origin_lng),
    baseFeeInr: Number(config.base_fee_inr),
    includedDistanceKm: Number(config.included_distance_km),
    extraPerKmInr: Number(config.extra_per_km_inr),
    maxServiceDistanceKm: Number(config.max_service_distance_km),
    isActive: config.is_active ?? true,
  };
}

function getTomTomApiKey(): string {
  const key = Deno.env.get("TOMTOM_API_KEY") ?? Deno.env.get("NEXT_PUBLIC_TOMTOM_API_KEY") ?? "";
  if (!key.trim()) {
    throw new HttpError(500, "Map services are temporarily unavailable.", { expose: false });
  }

  return key.trim();
}

export async function searchTomTomAddresses(
  query: string,
  options?: { limit?: number; typeahead?: boolean },
): Promise<TomTomAddressResult[]> {
  const normalizedQuery = sanitizeAddressText(query, "Address query");
  const key = getTomTomApiKey();
  const limit = options?.limit ?? 5;
  const typeahead = options?.typeahead ?? true;
  const url = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(normalizedQuery)}.json`);
  url.searchParams.set("key", key);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrySet", "IN");
  url.searchParams.set("language", "en-GB");
  url.searchParams.set("typeahead", typeahead ? "true" : "false");

  const response = await fetch(url);
  if (!response.ok) {
    throw new HttpError(502, "Unable to search addresses right now.", { expose: false });
  }

  const payload = await response.json() as TomTomSearchApiResponse;
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results.flatMap((result) => {
    const address = result.address?.freeformAddress?.trim() ?? "";
    const latitude = result.position?.lat;
    const longitude = result.position?.lon;

    if (!address || typeof latitude !== "number" || typeof longitude !== "number") {
      return [];
    }

    const secondaryText = [result.address?.municipality, result.address?.countrySubdivision]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(", ");

    return [
      {
        id: String(result.id ?? `${latitude},${longitude}`),
        address,
        secondaryText,
        latitude,
        longitude,
      },
    ];
  });
}

export async function geocodeAddressWithTomTom(address: string): Promise<TomTomAddressResult> {
  const matches = await searchTomTomAddresses(address, { limit: 1, typeahead: false });
  const match = matches[0];

  if (!match) {
    throw new HttpError(400, "We could not match that delivery address. Please choose a more specific address.");
  }

  return match;
}

export async function calculateRouteWithTomTom(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
): Promise<{ distanceMeters: number; durationSeconds: number }> {
  const key = getTomTomApiKey();
  const url = new URL(
    `https://api.tomtom.com/routing/1/calculateRoute/${originLat},${originLng}:${destinationLat},${destinationLng}/json`,
  );
  url.searchParams.set("key", key);
  url.searchParams.set("travelMode", "car");
  url.searchParams.set("routeType", "fastest");
  url.searchParams.set("traffic", "true");

  const response = await fetch(url);
  if (!response.ok) {
    throw new HttpError(502, "Unable to calculate the delivery route right now.", { expose: false });
  }

  const payload = await response.json() as TomTomRouteApiResponse;
  const summary = payload.routes?.[0]?.summary;
  const distanceMeters = Number(summary?.lengthInMeters ?? 0);
  const durationSeconds = Number(summary?.travelTimeInSeconds ?? summary?.trafficTimeInSeconds ?? 0);

  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new HttpError(502, "Unable to calculate the delivery route right now.", { expose: false });
  }

  return { distanceMeters, durationSeconds };
}

export function calculateDeliveryFeeInr(config: ShopDeliveryConfig, distanceMeters: number): number {
  const distanceKm = distanceMeters / 1000;
  const chargeableKm = Math.max(distanceKm - config.includedDistanceKm, 0);
  const fee = config.baseFeeInr + chargeableKm * config.extraPerKmInr;
  return Number(fee.toFixed(2));
}

export async function persistDeliveryQuote(
  adminClient: ReturnType<typeof createClient>,
  input: {
    userId: string;
    shopId: string;
    cartSignature: string;
    destinationAddress: string;
    destinationLat: number;
    destinationLng: number;
    distanceMeters: number;
    durationSeconds: number;
    deliveryFeeInr: number;
  },
): Promise<DeliveryQuoteRecord> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data, error } = await adminClient
    .from("delivery_quotes")
    .insert({
      user_id: input.userId,
      shop_id: input.shopId,
      cart_signature: input.cartSignature,
      destination_address: input.destinationAddress,
      destination_lat: input.destinationLat,
      destination_lng: input.destinationLng,
      distance_meters: input.distanceMeters,
      duration_seconds: input.durationSeconds,
      delivery_fee_inr: input.deliveryFeeInr,
      serviceable: true,
      expires_at: expiresAt,
    })
    .select(
      "id, user_id, shop_id, cart_signature, destination_address, destination_lat, destination_lng, distance_meters, duration_seconds, delivery_fee_inr, serviceable, expires_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapQuoteRow(data as DeliveryQuoteRow);
}

export async function loadValidatedDeliveryQuote(
  adminClient: ReturnType<typeof createClient>,
  options: {
    deliveryQuoteId: string;
    userId: string;
    shopId: string;
    cartSignature: string;
    allowExpired?: boolean;
  },
): Promise<DeliveryQuoteRecord> {
  const { data, error } = await adminClient
    .from("delivery_quotes")
    .select(
      "id, user_id, shop_id, cart_signature, destination_address, destination_lat, destination_lng, distance_meters, duration_seconds, delivery_fee_inr, serviceable, expires_at",
    )
    .eq("id", options.deliveryQuoteId)
    .eq("user_id", options.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new HttpError(400, "Delivery quote not found. Please refresh the delivery fee.");
  }

  const quote = mapQuoteRow(data as DeliveryQuoteRow);

  if (quote.shopId !== options.shopId) {
    throw new HttpError(400, "Delivery quote no longer matches the selected shop.");
  }

  if (quote.cartSignature !== options.cartSignature) {
    throw new HttpError(400, "Cart items changed. Refresh the delivery fee before checkout.");
  }

  if (!quote.serviceable) {
    throw new HttpError(400, "This delivery address is outside the service area.");
  }

  if (!options.allowExpired && new Date(quote.expiresAt).getTime() <= Date.now()) {
    throw new HttpError(400, "Delivery quote expired. Refresh the delivery fee before checkout.");
  }

  return quote;
}
