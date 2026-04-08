import { createClient, Session, SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";
import {
  DEFAULT_PRODUCT_POSITION,
  getCategoryFromSlug,
  getDefaultDisplaySection,
  normalizeProductType,
  normalizeLifeStage,
  productCategories,
  sortTags,
} from "@/data/catalog";
import {
  AdminRecord,
  AdminDeliveryConfig,
  AdminCoupon,
  Banner,
  CartItem,
  CheckoutDetails,
  CouponResult,
  DeliveryAddressSuggestion,
  DeliveryQuote,
  LoginPayload,
  OrderItem,
  OrderRecord,
  Product,
  ProductCategory,
  ProductShopInventory,
  SavedAddress,
  ShopLocation,
  SignupPayload,
  SignupResult,
  User,
} from "@/types";
import { calculateDiscountedPrice, isManufactureDateInvalid, isProductExpired } from "@/lib/commerce";

function getEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

const supabaseUrl = getEnvValue("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnvValue("VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
const supabaseBucket =
  getEnvValue("VITE_SUPABASE_BUCKET", "NEXT_PUBLIC_SUPABASE_BUCKET") ?? "product-images";
const bannerBucket =
  getEnvValue("VITE_SUPABASE_BANNER_BUCKET", "NEXT_PUBLIC_SUPABASE_BANNER_BUCKET") ?? "banners";
const razorpayKeyId = getEnvValue("VITE_RAZORPAY_KEY_ID", "NEXT_PUBLIC_RAZORPAY_KEY_ID");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

type SupabaseProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: User["role"] | null;
  approved: boolean | null;
  last_login_at?: string | null;
};

type SupabaseCategoryJoin = {
  name: string | null;
  slug: string | null;
} | null;

type SupabaseProductRow = {
  id: string;
  shop_id: string;
  name: string;
  product_type?: string | null;
  life_stage?: string | null;
  description: string | null;
  created_at?: string | null;
  price_inr: number;
  discount?: number | null;
  stock_quantity: number;
  images: string[] | null;
  is_active: boolean;
  tags?: Product["tags"] | null;
  brand?: string | null;
  weight?: string | null;
  packet_count?: number | null;
  is_sample?: boolean | null;
  manufacture_date?: string | null;
  expiry_date?: string | null;
  sold_count?: number | null;
  revenue?: number | null;
  rating?: number | null;
  display_section?: Product["displaySection"] | null;
  position?: number | null;
  category?: SupabaseCategoryJoin | SupabaseCategoryJoin[];
};

type SupabaseShopRow = {
  id: string;
  name: string;
  slug: string;
  status: ShopLocation["status"];
  origin_lat?: number | string | null;
  origin_lng?: number | string | null;
};

type SupabaseProductInventoryRow = {
  product_id: string;
  shop_id: string;
  stock_quantity: number;
  is_active: boolean | null;
  shop?: SupabaseShopRow | SupabaseShopRow[] | null;
};

type SupabaseAdminRequestRow = {
  user_id: string;
  status: "pending" | "approved" | "rejected" | "revoked";
};

type SupabaseBannerRow = {
  id: string;
  image_url: string;
  position: number;
};

type SupabaseCartRow = {
  id: string;
  product_id: string;
  quantity: number;
  selected: boolean | null;
  product: SupabaseProductRow | SupabaseProductRow[] | null;
};

type SupabaseCartBaseRow = {
  id: string;
  product_id: string;
  quantity: number;
  selected?: boolean | null;
  created_at?: string | null;
};

type SupabaseCouponRow = {
  id?: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_inr: number | null;
  max_discount_inr: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type SupabaseAdminDeliveryConfigRow = {
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

type SupabaseAddressRow = {
  id: string;
  label: string | null;
  full_name: string | null;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  is_default: boolean | null;
  created_at: string | null;
};

type SupabaseOrderItemRow = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_inr: number;
  total_inr: number;
  product: {
    images: string[] | null;
    is_sample: boolean | null;
  } | {
    images: string[] | null;
    is_sample: boolean | null;
  }[] | null;
};

type SupabaseOrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: OrderRecord["paymentStatus"];
  total_inr: number;
  delivery_address: string | null;
  mobile_number: string | null;
  delivery_time: string | null;
  created_at: string;
  items: SupabaseOrderItemRow[] | null;
};

type CreateRazorpayOrderResponse = {
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  key: string;
  deliveryFeeInr: number;
};

type VerifyRazorpayPaymentResponse = {
  order: SupabaseOrderRow;
};

type SearchDeliveryAddressesResponse = {
  suggestions: DeliveryAddressSuggestion[];
};

type ReverseGeocodeLocationResponse = {
  id: string;
  address: string;
  secondaryText: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
};

const IMAGE_MIME_TYPES: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const isDevelopment = import.meta.env.DEV;

const PRODUCT_SELECT = `
  id,
  shop_id,
  name,
  product_type,
  life_stage,
  description,
  created_at,
  price_inr,
  discount,
  stock_quantity,
  images,
  is_active,
  tags,
  brand,
  weight,
  packet_count,
  is_sample,
  manufacture_date,
  expiry_date,
  sold_count,
  revenue,
  rating,
  display_section,
  position,
  category:categories!products_category_id_fkey(name, slug)
`;

const LIFE_STAGE_PRODUCT_SELECT = `
  id,
  shop_id,
  name,
  life_stage,
  description,
  created_at,
  price_inr,
  discount,
  stock_quantity,
  images,
  is_active,
  tags,
  brand,
  manufacture_date,
  expiry_date,
  sold_count,
  revenue,
  rating,
  display_section,
  position,
  category:categories!products_category_id_fkey(name, slug)
`;

const ENHANCED_PRODUCT_SELECT = `
  id,
  shop_id,
  name,
  product_type,
  description,
  created_at,
  price_inr,
  discount,
  stock_quantity,
  images,
  is_active,
  tags,
  brand,
  weight,
  packet_count,
  is_sample,
  manufacture_date,
  expiry_date,
  sold_count,
  revenue,
  rating,
  display_section,
  position,
  category:categories!products_category_id_fkey(name, slug)
`;

const LEGACY_PRODUCT_SELECT = `
  id,
  shop_id,
  name,
  description,
  created_at,
  price_inr,
  discount,
  stock_quantity,
  images,
  is_active,
  tags,
  brand,
  manufacture_date,
  expiry_date,
  sold_count,
  revenue,
  rating,
  display_section,
  position,
  category:categories!products_category_id_fkey(name, slug)
`;

const CART_SELECT = `
  id,
  product_id,
  quantity,
  selected,
  product:products!cart_items_product_id_fkey(${PRODUCT_SELECT})
`;

const LEGACY_CART_SELECT = `
  id,
  product_id,
  quantity,
  product:products!cart_items_product_id_fkey(${LEGACY_PRODUCT_SELECT})
`;

const ORDER_SELECT = `
  id,
  order_number,
  status,
  payment_status,
  total_inr,
  delivery_address,
  mobile_number,
  delivery_time,
  created_at,
  items:order_items(
    product_id,
    product_name,
    quantity,
    unit_price_inr,
    total_inr,
    product:products(images, is_sample)
  )
`;

const LEGACY_ORDER_SELECT = `
  id,
  order_number,
  status,
  payment_status,
  total_inr,
  delivery_address,
  mobile_number,
  delivery_time,
  created_at,
  items:order_items(
    product_id,
    product_name,
    quantity,
    unit_price_inr,
    total_inr,
    product:products(images)
  )
`;

function requireSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and the matching anon key.",
    );
  }

  return supabase;
}

function requireRazorpayKeyId(): string {
  if (!razorpayKeyId) {
    throw new Error("Razorpay is not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to continue.");
  }

  return razorpayKeyId;
}

async function extractFunctionErrorMessage(issue: unknown, fallback: string): Promise<string> {
  const defaultMessage = issue instanceof Error && issue.message ? issue.message : fallback;

  if (!issue || typeof issue !== "object" || !("context" in issue)) {
    return defaultMessage;
  }

  const response = (issue as { context?: unknown }).context;
  if (!(response instanceof Response)) {
    return defaultMessage;
  }

  try {
    const clone = response.clone();
    const contentType = clone.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await clone.json() as { error?: string; message?: string };
      return payload.error ?? payload.message ?? defaultMessage;
    }

    const text = (await clone.text()).trim();
    if (!text) {
      return defaultMessage;
    }

    try {
      const payload = JSON.parse(text) as { error?: string; message?: string };
      return payload.error ?? payload.message ?? defaultMessage;
    } catch {
      return text;
    }
  } catch {
    return defaultMessage;
  }
}

function toError(issue: unknown, fallback: string): Error {
  if (issue instanceof Error) {
    return issue;
  }

  if (issue && typeof issue === "object" && "message" in issue && typeof issue.message === "string") {
    return new Error(issue.message);
  }

  return new Error(fallback);
}

function deriveNameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapProfileToUser(profile: SupabaseProfileRow): User {
  return {
    id: profile.id,
    name: profile.full_name?.trim() || deriveNameFromEmail(profile.email ?? "user@happypets.com"),
    email: profile.email ?? "unknown@happypets.com",
    role: profile.role ?? "customer",
    approved: profile.approved ?? profile.role !== "admin",
  };
}

function normalizeCategory(join: SupabaseCategoryJoin | SupabaseCategoryJoin[] | undefined): ProductCategory {
  const category = Array.isArray(join) ? join[0] : join;
  const byName = productCategories.find((item) => item === category?.name);
  if (byName) return byName;

  const bySlug = getCategoryFromSlug(category?.slug ?? undefined);
  if (bySlug) return bySlug;

  return "Dog";
}

function mapRowToProduct(row: SupabaseProductRow): Product {
  const category = normalizeCategory(row.category);
  const images = row.images?.length ? row.images : [];
  const primaryImage = images[0] ?? "";
  const productType = normalizeProductType(
    row.product_type ?? undefined,
    `${row.name} ${row.description ?? ""} ${row.weight ?? ""}`,
  );
  const derivedLifeStage = normalizeLifeStage(
    category,
    row.life_stage ?? "",
    `${row.name} ${row.description ?? ""}`,
  );

  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    category,
    productType,
    lifeStage: derivedLifeStage,
    displaySection: row.display_section ?? getDefaultDisplaySection(category),
    position: row.position ?? DEFAULT_PRODUCT_POSITION,
    tags: sortTags(row.tags ?? []),
    brand: row.brand ?? "HappyPets",
    image: primaryImage,
    gallery: images.length ? images : primaryImage ? [primaryImage] : [],
    description: row.description ?? "",
    quantity: row.stock_quantity,
    price: Number(row.price_inr),
    discount: Number(row.discount ?? 0),
    weight: row.weight ?? "",
    packetCount: row.packet_count ?? 1,
    isSample: Boolean(row.is_sample),
    createdAt: row.created_at ?? undefined,
    manufactureDate: row.manufacture_date ?? "",
    expiryDate: row.expiry_date ?? "",
    soldCount: row.sold_count ?? 0,
    revenue: Number(row.revenue ?? 0),
    rating: Number(row.rating ?? 4.8),
  };
}

function mapRowToShopLocation(row: SupabaseShopRow): ShopLocation {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    originLat: row.origin_lat == null ? null : Number(row.origin_lat),
    originLng: row.origin_lng == null ? null : Number(row.origin_lng),
  };
}

function mapInventoryRowToProductShopInventory(row: SupabaseProductInventoryRow): ProductShopInventory {
  const shop = Array.isArray(row.shop) ? row.shop[0] : row.shop;
  return {
    shopId: row.shop_id,
    shopName: shop?.name ?? "Shop",
    stockQuantity: Number(row.stock_quantity ?? 0),
    isActive: row.is_active ?? true,
  };
}

function mapRowToBanner(row: SupabaseBannerRow): Banner {
  return {
    id: row.id,
    imageUrl: row.image_url,
    position: row.position as Banner["position"],
  };
}

function mapRowToAdminCoupon(row: SupabaseCouponRow): AdminCoupon {
  return {
    id: row.id ?? "",
    code: row.code,
    description: row.description ?? "",
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minOrderInr: Number(row.min_order_inr ?? 0),
    maxDiscountInr: row.max_discount_inr == null ? null : Number(row.max_discount_inr),
    validFrom: row.valid_from ?? row.starts_at ?? "",
    validUntil: row.valid_until ?? row.ends_at ?? "",
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? "",
  };
}

function mapRowToAdminDeliveryConfig(
  row: SupabaseAdminDeliveryConfigRow | null,
  shopId: string,
  shopName: string,
): AdminDeliveryConfig {
  return {
    shopId,
    shopName,
    originAddress: row?.origin_address ?? "",
    originLat: row ? Number(row.origin_lat) : null,
    originLng: row ? Number(row.origin_lng) : null,
    baseFeeInr: row ? Number(row.base_fee_inr) : 0,
    includedDistanceKm: row ? Number(row.included_distance_km) : 0,
    extraPerKmInr: row ? Number(row.extra_per_km_inr) : 0,
    maxServiceDistanceKm: row ? Number(row.max_service_distance_km) : 15,
    isActive: row?.is_active ?? false,
  };
}

function mapRowToCartItem(row: SupabaseCartRow): CartItem {
  const productRow = Array.isArray(row.product) ? row.product[0] : row.product;

  if (!productRow) {
    throw new Error("Cart item is missing its product relationship.");
  }

  return {
    id: row.id,
    productId: row.product_id,
    product: mapRowToProduct(productRow),
    quantity: row.quantity,
    selected: row.selected ?? true,
  };
}

function mapBaseCartRowToCartItem(row: SupabaseCartBaseRow, productRow: SupabaseProductRow): CartItem {
  return {
    id: row.id,
    productId: row.product_id,
    product: mapRowToProduct(productRow),
    quantity: row.quantity,
    selected: row.selected ?? true,
  };
}

function mapRowToOrderItem(row: SupabaseOrderItemRow): OrderItem {
  const product = Array.isArray(row.product) ? row.product[0] : row.product;
  const image = product?.images?.[0] ?? "";

  return {
    productId: row.product_id,
    name: row.product_name,
    image,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price_inr),
    totalPrice: Number(row.total_inr),
    isSample: Boolean(product?.is_sample),
  };
}

function mapRowToOrder(row: SupabaseOrderRow): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    items: (row.items ?? []).map(mapRowToOrderItem),
    totalPrice: Number(row.total_inr),
    status: row.status,
    paymentStatus: row.payment_status,
    address: row.delivery_address ?? "",
    mobileNumber: row.mobile_number ?? "",
    deliveryTime: row.delivery_time ?? "",
    createdAt: row.created_at,
  };
}

function mapRowToSavedAddress(row: SupabaseAddressRow): SavedAddress {
  const formattedAddress = [
    row.address_line1,
    row.address_line2 ?? "",
    row.city,
    row.state,
    row.pincode,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  return {
    id: row.id,
    label: row.label?.trim() || "Saved address",
    fullName: row.full_name?.trim() || "HappyPets Customer",
    phone: row.phone?.trim() || "",
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 ?? "",
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    isDefault: row.is_default ?? false,
    createdAt: row.created_at ?? "",
    formattedAddress,
  };
}

async function getCurrentAuthUser(): Promise<SupabaseAuthUser | null> {
  const client = requireSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

async function getCurrentProfileRow(): Promise<SupabaseProfileRow | null> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, email, full_name, role, approved, last_login_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SupabaseProfileRow | null;
}

async function getCurrentAdminShopId(profileId?: string): Promise<string> {
  const client = requireSupabaseClient();
  const resolvedProfileId = profileId ?? (await getCurrentProfileRow())?.id;

  if (!resolvedProfileId) {
    throw new Error("Unable to resolve the current admin profile.");
  }

  const { data, error } = await client
    .from("shops")
    .select("id")
    .eq("admin_id", resolvedProfileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error("No shop is linked to this admin account yet.");
  }

  return data.id as string;
}

async function resolveCategoryId(category: ProductCategory): Promise<string> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from("categories")
    .select("id")
    .eq("slug", category.toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error(`Category '${category}' is not configured in Supabase.`);
  }

  return data.id as string;
}

function buildProductImages(product: Pick<Product, "image" | "gallery">): string[] {
  const images = [product.image, ...(product.gallery ?? [])].filter(Boolean);
  return [...new Set(images)];
}

function buildProductSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "product"}-${Date.now().toString(36)}`;
}

function buildShopSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return base || `shop-${Date.now().toString(36)}`;
}

function normalizeProductShopInventories(
  inventories: ProductShopInventory[] | undefined,
  fallbackShopId: string,
): ProductShopInventory[] {
  const source =
    inventories?.length
      ? inventories
      : [{ shopId: fallbackShopId, shopName: "", stockQuantity: 0, isActive: true }];

  return source
    .map((inventory) => ({
      shopId: inventory.shopId,
      shopName: inventory.shopName,
      stockQuantity: Math.max(0, Math.trunc(Number(inventory.stockQuantity) || 0)),
      isActive: inventory.isActive !== false,
    }))
    .filter((inventory, index, collection) =>
      inventory.shopId &&
      collection.findIndex((candidate) => candidate.shopId === inventory.shopId) === index
    );
}

function calculateInventoryTotal(inventories: ProductShopInventory[] | undefined, fallbackQuantity: number): number {
  if (!inventories?.length) {
    return Math.max(0, Math.trunc(Number(fallbackQuantity) || 0));
  }

  return inventories.reduce((sum, inventory) => sum + Math.max(0, Math.trunc(Number(inventory.stockQuantity) || 0)), 0);
}

function buildOrderNumber(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HPT-${date}-${suffix}`;
}

function validateProductInput(product: Omit<Product, "id" | "soldCount" | "revenue">): void {
  if (!Number.isFinite(product.price) || product.price <= 0) {
    throw new Error("Price must be greater than 0.");
  }

  if (!Number.isFinite(product.quantity) || product.quantity < 0) {
    throw new Error("Quantity cannot be negative.");
  }

  if (!Number.isFinite(product.discount ?? 0) || (product.discount ?? 0) < 0) {
    throw new Error("Discount cannot be negative.");
  }

  if (!Number.isFinite(product.packetCount) || product.packetCount < 1) {
    throw new Error("Packet count must be at least 1.");
  }

  if (!product.productType.trim()) {
    throw new Error("Product type is required.");
  }

  if (!product.shopInventories?.length) {
    throw new Error("Select at least one fulfillment shop.");
  }

  product.shopInventories.forEach((inventory) => {
    if (!inventory.shopId) {
      throw new Error("Each selected fulfillment shop must be valid.");
    }

    if (!Number.isFinite(inventory.stockQuantity) || inventory.stockQuantity < 0) {
      throw new Error("Per-shop stock must be 0 or greater.");
    }
  });

  if (isManufactureDateInvalid(product.manufactureDate, product.expiryDate)) {
    throw new Error("Manufacture date must be before expiry date.");
  }
}

function validateCheckoutInput(checkout: CheckoutDetails): void {
  if (!checkout.address.trim()) {
    throw new Error("Delivery address is required.");
  }

  if (!checkout.city.trim()) {
    throw new Error("City is required.");
  }

  if (!/^\d{6}$/.test(checkout.pincode.trim())) {
    throw new Error("Pincode must be exactly 6 digits.");
  }

  if (!/^\d{10}$/.test(checkout.mobileNumber.trim())) {
    throw new Error("Mobile number must be exactly 10 digits.");
  }

  const deliveryDate = new Date(checkout.deliveryTime);
  if (!checkout.deliveryTime || Number.isNaN(deliveryDate.getTime()) || deliveryDate.getTime() <= Date.now()) {
    throw new Error("Delivery time must be in the future.");
  }

  if (!checkout.deliveryQuoteId.trim()) {
    throw new Error("Calculate the delivery fee before checkout.");
  }

  if (!Number.isFinite(checkout.destinationLat) || !Number.isFinite(checkout.destinationLng)) {
    throw new Error("Delivery location is invalid. Select the address again.");
  }
}

function validateAdminCouponInput(input: {
  code: string;
  discountType: AdminCoupon["discountType"];
  discountValue: number;
  minOrderInr: number;
  maxDiscountInr: number | null;
  validFrom: string;
  validUntil: string;
}): void {
  if (!input.code.trim()) {
    throw new Error("Coupon code is required.");
  }

  if (!Number.isFinite(input.discountValue) || input.discountValue <= 0) {
    throw new Error("Discount value must be greater than 0.");
  }

  if (input.discountType === "percentage" && input.discountValue > 100) {
    throw new Error("Percentage discount cannot exceed 100.");
  }

  if (!Number.isFinite(input.minOrderInr) || input.minOrderInr < 0) {
    throw new Error("Minimum order must be 0 or greater.");
  }

  if (input.maxDiscountInr != null && (!Number.isFinite(input.maxDiscountInr) || input.maxDiscountInr < 0)) {
    throw new Error("Maximum discount must be 0 or greater.");
  }

  const validFromTime = new Date(input.validFrom).getTime();
  const validUntilTime = new Date(input.validUntil).getTime();

  if (!input.validFrom || Number.isNaN(validFromTime)) {
    throw new Error("Valid from time is required.");
  }

  if (!input.validUntil || Number.isNaN(validUntilTime)) {
    throw new Error("Valid until time is required.");
  }

  if (validFromTime >= validUntilTime) {
    throw new Error("Valid until must be later than valid from.");
  }
}

function validateAdminDeliveryConfigInput(input: Omit<AdminDeliveryConfig, "shopName">): void {
  if (!input.originAddress.trim()) {
    throw new Error("Origin address is required.");
  }

  if (!Number.isFinite(input.originLat) || (input.originLat ?? 0) < -90 || (input.originLat ?? 0) > 90) {
    throw new Error("Origin latitude must be between -90 and 90.");
  }

  if (!Number.isFinite(input.originLng) || (input.originLng ?? 0) < -180 || (input.originLng ?? 0) > 180) {
    throw new Error("Origin longitude must be between -180 and 180.");
  }

  if (!Number.isFinite(input.baseFeeInr) || input.baseFeeInr < 0) {
    throw new Error("Base delivery fee must be 0 or greater.");
  }

  if (!Number.isFinite(input.includedDistanceKm) || input.includedDistanceKm < 0) {
    throw new Error("Included distance must be 0 or greater.");
  }

  if (!Number.isFinite(input.extraPerKmInr) || input.extraPerKmInr < 0) {
    throw new Error("Extra per km fee must be 0 or greater.");
  }

  if (!Number.isFinite(input.maxServiceDistanceKm) || input.maxServiceDistanceKm <= 0) {
    throw new Error("Maximum service distance must be greater than 0.");
  }
}

function validateCartProductAvailability(
  product: Product,
  requestedQuantity: number,
  existingQuantity = 0,
): void {
  if (product.quantity <= 0) {
    throw new Error("This product is out of stock.");
  }

  if (isProductExpired(product.expiryDate)) {
    throw new Error("This product has expired and cannot be added to the cart.");
  }

  if (requestedQuantity > product.quantity) {
    throw new Error("Requested quantity exceeds available stock.");
  }

  if (existingQuantity + requestedQuantity > product.quantity) {
    throw new Error("Requested quantity exceeds available stock.");
  }
}

function isMissingProductEnhancementColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return ["weight", "packet_count", "is_sample", "life_stage", "product_type"].some((column) => message.includes(column));
}

function isMissingCartEnhancementColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return message.includes("selected") || isMissingProductEnhancementColumnError(issue);
}

function isMissingStorageBucketError(issue: unknown, bucketName: string): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return message.includes(bucketName.toLowerCase()) && (message.includes("bucket") || message.includes("not found"));
}

function isMissingRowError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const code = "code" in issue && typeof issue.code === "string" ? issue.code : "";
  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";

  return code === "PGRST116" || message.includes("0 rows") || message.includes("no rows");
}

function isMissingTableError(issue: unknown, tableName: string): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return (
    message.includes(`public.${tableName}`.toLowerCase()) &&
    (message.includes("schema cache") || message.includes("does not exist") || message.includes("relation"))
  );
}

function isMissingCouponValidityColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return ["valid_from", "valid_until", "starts_at", "ends_at"].some((column) => message.includes(column));
}

function isMissingAddressCoordinateColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return ["latitude", "longitude"].some((column) => message.includes(column));
}

function isMissingProductShopInventoryTableError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return message.includes("product_shop_inventory");
}

function isPermissionDeniedError(issue: unknown, tableName?: string): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const code = "code" in issue && typeof issue.code === "string" ? issue.code : "";
  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";

  if (code === "42501") {
    return true;
  }

  if (message.includes("row-level security") || message.includes("permission denied")) {
    return !tableName || message.includes(tableName.toLowerCase());
  }

  return false;
}

function toCouponAdminError(issue: unknown, fallback = "Unable to create coupon."): Error {
  if (isMissingTableError(issue, "coupons")) {
    return new Error("Coupon database is not set up. Apply the Supabase coupon migrations.");
  }

  if (isPermissionDeniedError(issue, "coupons")) {
    return new Error("Coupon permissions are not set up for admins. Apply the Supabase coupon admin policy migration.");
  }

  return toError(issue, fallback);
}

function toDeliveryAdminError(issue: unknown, fallback = "Unable to save delivery settings."): Error {
  if (isMissingTableError(issue, "shop_delivery_configs")) {
    return new Error("Delivery pricing database is not set up. Apply the Supabase delivery pricing migration.");
  }

  if (isPermissionDeniedError(issue, "shop_delivery_configs")) {
    return new Error("Delivery settings permissions are not set up for admins yet.");
  }

  return toError(issue, fallback);
}

function toShopAdminError(issue: unknown, fallback = "Unable to save shop settings."): Error {
  if (isPermissionDeniedError(issue, "shops")) {
    return new Error("Shop permissions are not set up for this account yet.");
  }

  return toError(issue, fallback);
}

function validateShopLocationInput(input: Omit<ShopLocation, "id" | "slug">): void {
  if (!input.name.trim()) {
    throw new Error("Shop name is required.");
  }

  if (!Number.isFinite(input.originLat) || (input.originLat ?? 0) < -90 || (input.originLat ?? 0) > 90) {
    throw new Error("Shop latitude must be between -90 and 90.");
  }

  if (!Number.isFinite(input.originLng) || (input.originLng ?? 0) < -180 || (input.originLng ?? 0) > 180) {
    throw new Error("Shop longitude must be between -180 and 180.");
  }
}

function resolveImageMimeType(file: Pick<File, "name" | "type">): string | null {
  if (file.type?.startsWith("image/")) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_TYPES[extension] ?? null;
}

function validateImageUpload(file: Pick<File, "name" | "type" | "size">): void {
  const contentType = resolveImageMimeType(file);
  if (!contentType) {
    throw new Error("Invalid file. Please upload a PNG, JPG, WEBP, AVIF, or GIF image.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Image is too large. Please upload a file under 5 MB.");
  }
}

function buildStoragePath(folder: string, file: Pick<File, "name">): string {
  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const extension = IMAGE_MIME_TYPES[rawExtension] ? rawExtension : "jpg";
  return `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

async function fetchCartBaseRows(
  client: SupabaseClient,
  userId: string,
  options?: { productId?: string },
): Promise<SupabaseCartBaseRow[]> {
  const attempt = async (selectClause: string): Promise<SupabaseCartBaseRow[]> => {
    let query = client
      .from("cart_items")
      .select(selectClause)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.productId) {
      query = query.eq("product_id", options.productId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error, "cart_items")) {
        throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
      }
      throw error;
    }

    return (data ?? []) as SupabaseCartBaseRow[];
  };

  try {
    return await attempt("id, product_id, quantity, selected, created_at");
  } catch (issue) {
    if (!isMissingCartEnhancementColumnError(issue)) {
      throw issue;
    }

    return attempt("id, product_id, quantity, created_at");
  }
}

async function fetchCartBaseRowById(
  client: SupabaseClient,
  cartItemId: string,
): Promise<SupabaseCartBaseRow | null> {
  const attempt = async (selectClause: string): Promise<SupabaseCartBaseRow | null> => {
    const { data, error } = await client
      .from("cart_items")
      .select(selectClause)
      .eq("id", cartItemId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error, "cart_items")) {
        throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
      }
      throw error;
    }

    return (data as SupabaseCartBaseRow | null) ?? null;
  };

  try {
    return await attempt("id, product_id, quantity, selected, created_at");
  } catch (issue) {
    if (!isMissingCartEnhancementColumnError(issue)) {
      throw issue;
    }

    return attempt("id, product_id, quantity, created_at");
  }
}

async function fetchProductsByIds(
  client: SupabaseClient,
  productIds: string[],
): Promise<Map<string, SupabaseProductRow>> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map();
  }

  const attempt = async (selectClause: string): Promise<Map<string, SupabaseProductRow>> => {
    const { data, error } = await client.from("products").select(selectClause).in("id", uniqueIds);

    if (error) {
      throw error;
    }

    return new Map((data ?? []).map((row) => [row.id as string, row as SupabaseProductRow]));
  };

  try {
    return await attempt(PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load products.");
    }
  }

  try {
    return await attempt(LIFE_STAGE_PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load products.");
    }
  }

  try {
    return await attempt(ENHANCED_PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load products.");
    }
  }

  return attempt(LEGACY_PRODUCT_SELECT);
}

async function loadRazorpayCheckoutScript(): Promise<void> {
  if (window.Razorpay) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-razorpay="checkout"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "checkout";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

async function fetchProductById(productId: string): Promise<Product> {
  const client = requireSupabaseClient();
  const attempt = async (selectClause: string): Promise<Product> => {
    const { data, error } = await client.from("products").select(selectClause).eq("id", productId).single();

    if (error) {
      throw error;
    }

    return mapRowToProduct(data as SupabaseProductRow);
  };

  const hydrateSingle = async (product: Product): Promise<Product> => {
    const [hydrated] = await hydrateProductsWithShopInventories([product]);
    return hydrated ?? product;
  };

  try {
    return await hydrateSingle(await attempt(PRODUCT_SELECT));
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load product.");
    }
  }

  try {
    return await hydrateSingle(await attempt(LIFE_STAGE_PRODUCT_SELECT));
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load product.");
    }
  }

  try {
    return await hydrateSingle(await attempt(ENHANCED_PRODUCT_SELECT));
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load product.");
    }
  }

  return hydrateSingle(await attempt(LEGACY_PRODUCT_SELECT));
}

async function fetchProductShopInventories(
  productIds: string[],
): Promise<Map<string, ProductShopInventory[]>> {
  const client = requireSupabaseClient();

  if (!productIds.length) {
    return new Map();
  }

  try {
    const { data, error } = await client
      .from("product_shop_inventory")
      .select("product_id, shop_id, stock_quantity, is_active, shop:shops(id, name, slug, status, origin_lat, origin_lng)")
      .in("product_id", productIds);

    if (error) {
      throw error;
    }

    const inventoryMap = new Map<string, ProductShopInventory[]>();
    ((data ?? []) as SupabaseProductInventoryRow[]).forEach((row) => {
      const current = inventoryMap.get(row.product_id) ?? [];
      current.push(mapInventoryRowToProductShopInventory(row));
      inventoryMap.set(row.product_id, current);
    });

    return inventoryMap;
  } catch (issue) {
    if (!isMissingProductShopInventoryTableError(issue)) {
      throw issue;
    }

    return new Map();
  }
}

async function hydrateProductsWithShopInventories(products: Product[]): Promise<Product[]> {
  const inventoryMap = await fetchProductShopInventories(products.map((product) => product.id));

  return products.map((product) => {
    const shopInventories = inventoryMap.get(product.id) ?? [];
    if (!shopInventories.length) {
      return product;
    }

    const totalQuantity = shopInventories
      .filter((inventory) => inventory.isActive)
      .reduce((sum, inventory) => sum + inventory.stockQuantity, 0);

    return {
      ...product,
      quantity: totalQuantity,
      shopInventories,
    };
  });
}

export async function uploadImageToSupabase(
  file: File,
  onProgress?: (value: number) => void,
): Promise<string> {
  const client = requireSupabaseClient();
  validateImageUpload(file);
  const contentType = resolveImageMimeType(file)!;

  let progress = 8;
  onProgress?.(progress);

  const interval = window.setInterval(() => {
    progress = Math.min(progress + 12, 90);
    onProgress?.(progress);
  }, 120);

  const uploadAsset = async (bucketName: string, folder: string): Promise<string> => {
    const path = buildStoragePath(folder, file);
    const { error } = await client.storage.from(bucketName).upload(path, file, {
      cacheControl: "31536000",
      contentType,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = client.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  };

  try {
    const publicUrl = await uploadAsset(supabaseBucket, "products");
    onProgress?.(100);
    return publicUrl;
  } catch (issue) {
    onProgress?.(0);
    throw issue instanceof Error ? issue : new Error("Upload failed.");
  } finally {
    window.clearInterval(interval);
  }
}

export async function uploadBannerImageToSupabase(
  file: File,
  onProgress?: (value: number) => void,
): Promise<string> {
  const client = requireSupabaseClient();
  validateImageUpload(file);
  const contentType = resolveImageMimeType(file)!;

  let progress = 8;
  onProgress?.(progress);

  const interval = window.setInterval(() => {
    progress = Math.min(progress + 10, 90);
    onProgress?.(progress);
  }, 120);

  const uploadAsset = async (bucketName: string): Promise<string> => {
    const path = buildStoragePath("banners", file);
    const { error } = await client.storage.from(bucketName).upload(path, file, {
      cacheControl: "31536000",
      contentType,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = client.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  };

  try {
    try {
      const publicUrl = await uploadAsset(bannerBucket);
      onProgress?.(100);
      return publicUrl;
    } catch (issue) {
      if (bannerBucket !== supabaseBucket && isMissingStorageBucketError(issue, bannerBucket)) {
        if (isDevelopment) {
          console.warn("[banners][supabase] banner bucket missing, falling back to product bucket", {
            bannerBucket,
            fallbackBucket: supabaseBucket,
          });
        }
        const publicUrl = await uploadAsset(supabaseBucket);
        onProgress?.(100);
        return publicUrl;
      }

      throw issue;
    }
  } catch (issue) {
    onProgress?.(0);
    if (issue instanceof Error) {
      throw issue;
    }
    throw new Error("Upload failed.");
  } finally {
    window.clearInterval(interval);
  }
}

export async function fetchCurrentUserFromSupabase(): Promise<User | null> {
  const profile = await getCurrentProfileRow();
  return profile ? mapProfileToUser(profile) : null;
}

export async function signInWithSupabase(
  payload: LoginPayload,
): Promise<{ user: User; session: Session }> {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error("Supabase did not return an active session.");
  }

  await client.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  const user = await fetchCurrentUserFromSupabase();

  if (!user) {
    throw new Error("Your profile was not found. Apply the Supabase migrations before signing in.");
  }

  return {
    user,
    session: data.session,
  };
}

export async function signUpWithSupabase(payload: SignupPayload): Promise<SignupResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.name,
        requested_role: payload.role,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    return {
      user: null,
      requiresEmailVerification: true,
      message: "Account created. Verify your email, then sign in to continue.",
    };
  }

  const user = await fetchCurrentUserFromSupabase();

  return {
    user,
    requiresEmailVerification: false,
    message:
      payload.role === "admin"
        ? "Admin account created. It will remain pending until a superadmin approves it."
        : "Account created successfully.",
  };
}

export async function signOutFromSupabase(): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();
  const applyScope = async (selectClause: string): Promise<Product[]> => {
    let query = client.from("products").select(selectClause).order("position").order("name");

    if (!profile || profile.role === "customer") {
      query = query.eq("is_active", true);
    } else if (profile.role === "admin") {
      const shopId = await getCurrentAdminShopId(profile.id);
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const mapped = (data ?? []).map((row) => mapRowToProduct(row as SupabaseProductRow));
    const hydrated = await hydrateProductsWithShopInventories(mapped);

    if (!profile || profile.role === "customer") {
      return hydrated.filter((product) => {
        const inventories = product.shopInventories ?? [];
        if (!inventories.length) {
          return product.quantity > 0;
        }

        return inventories.some((inventory) => inventory.isActive && inventory.stockQuantity > 0);
      });
    }

    return hydrated;
  };

  try {
    return await applyScope(PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load products.");
    }
  }

  try {
    return await applyScope(LIFE_STAGE_PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load products.");
    }
  }

  try {
    return await applyScope(ENHANCED_PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to load products.");
    }
  }

  return applyScope(LEGACY_PRODUCT_SELECT);
}

export async function createProductInSupabase(
  product: Omit<Product, "id" | "soldCount" | "revenue">,
): Promise<Product> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "admin" || !profile.approved) {
    throw new Error("Only approved admins can create products.");
  }

  validateProductInput(product);

  const [categoryId, shopId] = await Promise.all([
    resolveCategoryId(product.category),
    getCurrentAdminShopId(profile.id),
  ]);
  const normalizedInventories = normalizeProductShopInventories(product.shopInventories, shopId);
  const totalQuantity = calculateInventoryTotal(normalizedInventories, product.quantity);

  const legacyPayload = {
    shop_id: shopId,
    category_id: categoryId,
    name: product.name,
    slug: buildProductSlug(product.name),
    description: product.description,
    price_inr: product.price,
    compare_at_price: null,
    stock_quantity: totalQuantity,
    images: buildProductImages(product),
    tags: sortTags(product.tags ?? []),
    brand: product.brand,
    discount: product.discount ?? 0,
    manufacture_date: product.manufactureDate,
    expiry_date: product.expiryDate,
    sold_count: 0,
    revenue: 0,
    rating: product.rating,
    display_section: product.displaySection,
    position: product.position,
    is_active: true,
  };

  const enhancedPayload = {
    ...legacyPayload,
    product_type: product.productType.trim(),
    weight: product.weight,
    packet_count: product.packetCount,
    is_sample: product.isSample,
  };

  const lifeStagePayload = {
    ...legacyPayload,
    life_stage: product.lifeStage?.trim() || null,
  };

  const fullPayload = {
    ...enhancedPayload,
    life_stage: product.lifeStage?.trim() || null,
  };

  const insertProduct = async (
    payload: typeof fullPayload | typeof enhancedPayload | typeof legacyPayload,
  ): Promise<string> => {
    const { data, error } = await client.from("products").insert(payload).select("id").single();

    if (error) {
      throw toError(error, "Unable to save product.");
    }

    return data.id as string;
  };

  const saveInventories = async (productId: string): Promise<void> => {
    try {
      const { error } = await client
        .from("product_shop_inventory")
        .upsert(
          normalizedInventories.map((inventory) => ({
            product_id: productId,
            shop_id: inventory.shopId,
            stock_quantity: Math.max(0, Math.trunc(inventory.stockQuantity)),
            is_active: inventory.isActive,
          })),
          { onConflict: "product_id,shop_id" },
        );

      if (error) {
        throw error;
      }
    } catch (issue) {
      if (!isMissingProductShopInventoryTableError(issue)) {
        throw toError(issue, "Unable to save product shops.");
      }
    }
  };

  try {
    const productId = await insertProduct(fullPayload);
    await saveInventories(productId);
    return fetchProductById(productId);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to save product.");
    }
  }

  try {
    const productId = await insertProduct(lifeStagePayload);
    await saveInventories(productId);
    return fetchProductById(productId);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to save product.");
    }
  }

  try {
    const productId = await insertProduct(enhancedPayload);
    await saveInventories(productId);
    return fetchProductById(productId);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to save product.");
    }
  }

  const productId = await insertProduct(legacyPayload);
  await saveInventories(productId);
  return fetchProductById(productId);
}

export async function updateProductInSupabase(
  productId: string,
  product: Omit<Product, "id" | "soldCount" | "revenue">,
): Promise<Product> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "admin" || !profile.approved) {
    throw new Error("Only approved admins can update products.");
  }

  validateProductInput(product);

  const categoryId = await resolveCategoryId(product.category);
  const profileShopId = await getCurrentAdminShopId(profile.id);
  const normalizedInventories = normalizeProductShopInventories(product.shopInventories, profileShopId);
  const totalQuantity = calculateInventoryTotal(normalizedInventories, product.quantity);

  const legacyPayload = {
    category_id: categoryId,
    name: product.name,
    description: product.description,
    price_inr: product.price,
    stock_quantity: totalQuantity,
    images: buildProductImages(product),
    tags: sortTags(product.tags ?? []),
    brand: product.brand,
    discount: product.discount ?? 0,
    manufacture_date: product.manufactureDate,
    expiry_date: product.expiryDate,
    rating: product.rating,
    display_section: product.displaySection,
    position: product.position,
  };

  const enhancedPayload = {
    ...legacyPayload,
    product_type: product.productType.trim(),
    weight: product.weight,
    packet_count: product.packetCount,
    is_sample: product.isSample,
  };

  const lifeStagePayload = {
    ...legacyPayload,
    life_stage: product.lifeStage?.trim() || null,
  };

  const fullPayload = {
    ...enhancedPayload,
    life_stage: product.lifeStage?.trim() || null,
  };

  const updateProduct = async (
    payload: typeof fullPayload | typeof enhancedPayload | typeof legacyPayload,
  ): Promise<void> => {
    const { error } = await client.from("products").update(payload).eq("id", productId);

    if (error) {
      throw toError(error, "Unable to save product.");
    }
  };

  const saveInventories = async (): Promise<void> => {
    try {
      const { error: deleteError } = await client
        .from("product_shop_inventory")
        .delete()
        .eq("product_id", productId);

      if (deleteError) {
        throw deleteError;
      }

      const { error } = await client
        .from("product_shop_inventory")
        .upsert(
          normalizedInventories.map((inventory) => ({
            product_id: productId,
            shop_id: inventory.shopId,
            stock_quantity: Math.max(0, Math.trunc(inventory.stockQuantity)),
            is_active: inventory.isActive,
          })),
          { onConflict: "product_id,shop_id" },
        );

      if (error) {
        throw error;
      }
    } catch (issue) {
      if (!isMissingProductShopInventoryTableError(issue)) {
        throw toError(issue, "Unable to save product shops.");
      }
    }
  };

  try {
    await updateProduct(fullPayload);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to save product.");
    }
  }

  try {
    await updateProduct(lifeStagePayload);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to save product.");
    }
  }

  try {
    await updateProduct(enhancedPayload);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw toError(issue, "Unable to save product.");
    }
  }

  await updateProduct(legacyPayload);
  await saveInventories();

  return fetchProductById(productId);
}

export async function deleteProductFromSupabase(productId: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from("products").update({ is_active: false }).eq("id", productId);

  if (error) {
    throw error;
  }
}

export async function fetchBannersFromSupabase(): Promise<Banner[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client.from("banners").select("id, image_url, position").order("position");

  if (error) {
    if (isMissingTableError(error, "banners")) {
      throw new Error("Banner database is not set up. Apply the Supabase banner migrations.");
    }
    throw error;
  }

  return (data ?? [])
    .map((row) => mapRowToBanner(row as SupabaseBannerRow))
    .filter((banner) => banner.position >= 1 && banner.position <= 10)
    .sort((left, right) => left.position - right.position);
}

export async function saveBannerInSupabase(input: Omit<Banner, "id"> & { id?: string }): Promise<Banner> {
  const client = requireSupabaseClient();
  const imageUrl = input.imageUrl.trim();

  if (!imageUrl) {
    throw new Error("Banner image URL is required.");
  }

  if (input.position < 1 || input.position > 10) {
    throw new Error("Banner position must be between 1 and 10.");
  }

  if (isDevelopment) {
    console.log("[banners][supabase] save request", {
      id: input.id ?? null,
      position: input.position,
      imageUrl,
    });
  }

  const existingQuery = await client
    .from("banners")
    .select("id")
    .eq("position", input.position)
    .maybeSingle();

  if (existingQuery.error) {
    if (isMissingTableError(existingQuery.error, "banners")) {
      throw new Error("Banner database is not set up. Apply the Supabase banner migrations.");
    }
    throw existingQuery.error;
  }

  const payload = {
    image_url: imageUrl,
    position: input.position,
  };

  const mutation = existingQuery.data?.id
    ? client.from("banners").update(payload).eq("id", existingQuery.data.id)
    : client.from("banners").insert(payload);

  const { data, error } = await mutation.select("id, image_url, position").single();

  if (error) {
    if (isMissingTableError(error, "banners")) {
      throw new Error("Banner database is not set up. Apply the Supabase banner migrations.");
    }
    throw error;
  }

  return mapRowToBanner(data as SupabaseBannerRow);
}

export async function deleteBannerFromSupabase(bannerId: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from("banners").delete().eq("id", bannerId);

  if (error) {
    if (isMissingTableError(error, "banners")) {
      throw new Error("Banner database is not set up. Apply the Supabase banner migrations.");
    }
    throw error;
  }
}

export async function fetchFavoriteIdsFromSupabase(): Promise<string[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return [];
  }

  const { data, error } = await client
    .from("favorites")
    .select("product_id")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.product_id as string);
}

export async function addFavoriteInSupabase(productId: string): Promise<string[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    throw new Error("Sign in to manage favorites.");
  }

  const { error } = await client.from("favorites").insert({
    user_id: authUser.id,
    product_id: productId,
  });

  if (error && error.code !== "23505") {
    throw error;
  }

  return fetchFavoriteIdsFromSupabase();
}

export async function removeFavoriteInSupabase(productId: string): Promise<string[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    throw new Error("Sign in to manage favorites.");
  }

  const { error } = await client
    .from("favorites")
    .delete()
    .eq("user_id", authUser.id)
    .eq("product_id", productId);

  if (error) {
    throw error;
  }

  return fetchFavoriteIdsFromSupabase();
}

export async function fetchCartItemsFromSupabase(): Promise<CartItem[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return [];
  }

  const attempt = async (selectClause: string): Promise<CartItem[]> => {
    const { data, error } = await client
      .from("cart_items")
      .select(selectClause)
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => mapRowToCartItem(row as SupabaseCartRow));
  };

  try {
    const items = await attempt(CART_SELECT);
    console.log("[cart][supabase] fetch success", {
      userId: authUser.id,
      strategy: "joined",
      itemCount: items.length,
    });
    return items;
  } catch (issue) {
    console.warn("[cart][supabase] joined cart fetch failed, retrying", {
      userId: authUser.id,
      issue,
    });

    if (isMissingCartEnhancementColumnError(issue)) {
      try {
        const items = await attempt(LEGACY_CART_SELECT);
        console.log("[cart][supabase] fetch success", {
          userId: authUser.id,
          strategy: "legacy-joined",
          itemCount: items.length,
        });
        return items;
      } catch (legacyIssue) {
        console.warn("[cart][supabase] legacy joined cart fetch failed, using fallback", {
          userId: authUser.id,
          issue: legacyIssue,
        });
      }
    }
  }

  const baseRows = await fetchCartBaseRows(client, authUser.id);
  const productsById = await fetchProductsByIds(
    client,
    baseRows.map((row) => row.product_id),
  );

  const items = baseRows.flatMap((row) => {
    const productRow = productsById.get(row.product_id);
    if (!productRow) {
      console.warn("[cart][supabase] cart row skipped because product could not be resolved", {
        userId: authUser.id,
        cartItemId: row.id,
        productId: row.product_id,
      });
      return [];
    }

    return [mapBaseCartRowToCartItem(row, productRow)];
  });

  console.log("[cart][supabase] fetch success", {
    userId: authUser.id,
    strategy: "base-row-fallback",
    itemCount: items.length,
  });

  return items;
}

export async function addCartItemInSupabase(productId: string, quantity: number): Promise<CartItem[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    throw new Error("User not authenticated.");
  }

  if (!productId) {
    throw new Error("Product not found.");
  }

  const normalizedQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;

  let product: Product;
  try {
    product = await fetchProductById(productId);
  } catch (issue) {
    console.error("[cart][supabase] product validation failed", {
      userId: authUser.id,
      productId,
      issue,
    });

    if (isMissingRowError(issue)) {
      throw new Error("Product not found.");
    }

    throw issue;
  }

  console.log("[cart][supabase] add request", {
    userId: authUser.id,
    productId,
    quantity: normalizedQuantity,
  });

  const existingRows = await fetchCartBaseRows(client, authUser.id, { productId });
  const existing = existingRows[0];
  validateCartProductAvailability(product!, normalizedQuantity, existing?.quantity ?? 0);

  if (existing) {
    try {
      const { error } = await client
        .from("cart_items")
        .update({ quantity: existing.quantity + normalizedQuantity, selected: true })
        .eq("id", existing.id);

      if (error) {
        if (isMissingTableError(error, "cart_items")) {
          throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
        }
        throw error;
      }

      console.log("[cart][supabase] updated existing cart row", {
        userId: authUser.id,
        cartItemId: existing.id,
        productId,
        quantity: existing.quantity + normalizedQuantity,
      });
    } catch (issue) {
      if (!isMissingCartEnhancementColumnError(issue)) {
        console.error("[cart][supabase] update existing cart row failed", {
          userId: authUser.id,
          cartItemId: existing.id,
          productId,
          issue,
        });
        throw issue;
      }

      const { error } = await client
        .from("cart_items")
        .update({ quantity: existing.quantity + normalizedQuantity })
        .eq("id", existing.id);

      if (error) {
        if (isMissingTableError(error, "cart_items")) {
          throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
        }
        throw error;
      }

      console.log("[cart][supabase] updated existing cart row", {
        userId: authUser.id,
        cartItemId: existing.id,
        productId,
        quantity: existing.quantity + normalizedQuantity,
        strategy: "legacy-update",
      });
    }

    return fetchCartItemsFromSupabase();
  }

  try {
    const { error } = await client.from("cart_items").insert({
      user_id: authUser.id,
      product_id: productId,
      quantity: normalizedQuantity,
      selected: true,
    });

    if (error) {
      if (isMissingTableError(error, "cart_items")) {
        throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
      }
      throw error;
    }

    console.log("[cart][supabase] inserted new cart row", {
      userId: authUser.id,
      productId,
      quantity: normalizedQuantity,
    });
  } catch (issue) {
    if (!isMissingCartEnhancementColumnError(issue)) {
      console.error("[cart][supabase] insert cart row failed", {
        userId: authUser.id,
        productId,
        quantity: normalizedQuantity,
        issue,
      });
      throw issue;
    }

    const { error } = await client.from("cart_items").insert({
      user_id: authUser.id,
      product_id: productId,
      quantity: normalizedQuantity,
    });

    if (error) {
      if (isMissingTableError(error, "cart_items")) {
        throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
      }
      throw error;
    }

    console.log("[cart][supabase] inserted new cart row", {
      userId: authUser.id,
      productId,
      quantity: normalizedQuantity,
      strategy: "legacy-insert",
    });
  }

  return fetchCartItemsFromSupabase();
}

export async function updateCartItemInSupabase(
  cartItemId: string,
  input: { quantity?: number; selected?: boolean },
): Promise<CartItem[]> {
  const client = requireSupabaseClient();
  const nextPayload: Record<string, number | boolean> = {};

  if (typeof input.quantity === "number") {
    const normalizedQuantity = Number.isFinite(input.quantity) ? Math.max(1, Math.floor(input.quantity)) : 1;
    const row = await fetchCartBaseRowById(client, cartItemId);
    if (!row) {
      throw new Error("Cart item not found.");
    }

    const product = await fetchProductById(row.product_id);
    validateCartProductAvailability(product, normalizedQuantity);
    nextPayload.quantity = normalizedQuantity;
  }

  if (typeof input.selected === "boolean") {
    nextPayload.selected = input.selected;
  }

  console.log("[cart][supabase] update request", {
    cartItemId,
    input,
  });

  try {
    const { error } = await client.from("cart_items").update(nextPayload).eq("id", cartItemId);

    if (error) {
      if (isMissingTableError(error, "cart_items")) {
        throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
      }
      throw error;
    }
  } catch (issue) {
    if (!isMissingCartEnhancementColumnError(issue)) {
      console.error("[cart][supabase] update failed", {
        cartItemId,
        input,
        issue,
      });
      throw issue;
    }

    const fallbackPayload = { ...nextPayload };
    delete fallbackPayload.selected;

    if (!Object.keys(fallbackPayload).length) {
      return fetchCartItemsFromSupabase();
    }

    const { error } = await client.from("cart_items").update(fallbackPayload).eq("id", cartItemId);

    if (error) {
      if (isMissingTableError(error, "cart_items")) {
        throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
      }
      throw error;
    }
  }

  return fetchCartItemsFromSupabase();
}

export async function removeCartItemFromSupabase(cartItemId: string): Promise<CartItem[]> {
  const client = requireSupabaseClient();
  console.log("[cart][supabase] remove request", { cartItemId });
  const { error } = await client.from("cart_items").delete().eq("id", cartItemId);

  if (error) {
    if (isMissingTableError(error, "cart_items")) {
      throw new Error("Cart database is not set up. Apply the Supabase cart migrations.");
    }
    console.error("[cart][supabase] remove failed", {
      cartItemId,
      error,
    });
    throw error;
  }

  return fetchCartItemsFromSupabase();
}

export async function applyCouponInSupabase(
  code: string,
  subtotal: number,
): Promise<CouponResult | null> {
  const client = requireSupabaseClient();
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const now = new Date().toISOString();
  let data;

  try {
    const result = await client
      .from("coupons")
      .select("code, description, discount_type, discount_value, min_order_inr, max_discount_inr")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .lte("valid_from", now)
      .gte("valid_until", now)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    data = result.data;
  } catch (issue) {
    if (!isMissingCouponValidityColumnError(issue)) {
      throw issue;
    }

    const legacyResult = await client
      .from("coupons")
      .select("code, description, discount_type, discount_value, min_order_inr, max_discount_inr")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .lte("starts_at", now)
      .gte("ends_at", now)
      .maybeSingle();

    if (legacyResult.error) {
      throw legacyResult.error;
    }

    data = legacyResult.data;
  }

  if (!data) {
    return null;
  }

  const coupon = data as SupabaseCouponRow;
  const minimumOrder = Number(coupon.min_order_inr ?? 0);
  if (subtotal < minimumOrder) {
    throw new Error(`This coupon requires a minimum order of ₹${minimumOrder.toFixed(0)}.`);
  }

  let discountAmount =
    coupon.discount_type === "percentage"
      ? (subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);

  if (coupon.max_discount_inr) {
    discountAmount = Math.min(discountAmount, Number(coupon.max_discount_inr));
  }

  return {
    code: coupon.code,
    description: coupon.description ?? "Coupon applied",
    discountAmount: Math.min(discountAmount, subtotal),
  };
}

export async function searchDeliveryAddressesInSupabase(query: string): Promise<DeliveryAddressSuggestion[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    throw new Error("Sign in to search delivery addresses.");
  }

  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 5) {
    return [];
  }

  const { data, error } = await client.functions.invoke<SearchDeliveryAddressesResponse>(
    "search-delivery-addresses",
    {
      body: {
        query: normalizedQuery,
      },
    },
  );

  if (error) {
    throw new Error(await extractFunctionErrorMessage(error, "Unable to search delivery addresses."));
  }

  return data?.suggestions ?? [];
}

export async function reverseGeocodeLocationInSupabase(input: {
  lat: number;
  lng: number;
}): Promise<ReverseGeocodeLocationResponse> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    throw new Error("Sign in to resolve pinned delivery locations.");
  }

  const { data, error } = await client.functions.invoke<ReverseGeocodeLocationResponse>(
    "reverse-geocode-location",
    {
      body: input,
    },
  );

  if (error) {
    throw new Error(await extractFunctionErrorMessage(error, "Unable to identify the selected map pin."));
  }

  if (!data) {
    throw new Error("Unable to identify the selected map pin.");
  }

  return data;
}

export async function fetchSavedAddressesFromSupabase(): Promise<SavedAddress[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return [];
  }

  const fetchRows = async (selectClause: string) => {
    const { data, error } = await client
      .from("addresses")
      .select(selectClause)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      throw error;
    }

    return (data ?? []) as SupabaseAddressRow[];
  };

  try {
    return (await fetchRows(
      "id, label, full_name, phone, address_line1, address_line2, city, state, pincode, latitude, longitude, is_default, created_at",
    )).map(mapRowToSavedAddress);
  } catch (issue) {
    if (!isMissingAddressCoordinateColumnError(issue)) {
      throw issue;
    }

    return (await fetchRows(
      "id, label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default, created_at",
    )).map(mapRowToSavedAddress);
  }
}

export async function quoteDeliveryInSupabase(input: {
  address: string;
  destinationLat?: number;
  destinationLng?: number;
}): Promise<DeliveryQuote> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    throw new Error("Sign in to calculate delivery.");
  }

  const normalizedAddress = input.address.trim();
  if (!normalizedAddress) {
    throw new Error("Select a delivery address first.");
  }

  const { data, error } = await client.functions.invoke<DeliveryQuote>("quote-delivery", {
    body: {
      address: normalizedAddress,
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
    },
  });

  if (error) {
    throw new Error(await extractFunctionErrorMessage(error, "Unable to calculate the delivery fee."));
  }

  if (!data) {
    throw new Error("Unable to calculate the delivery fee.");
  }

  return data;
}

export async function fetchAdminDeliveryConfigFromSupabase(): Promise<AdminDeliveryConfig> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "admin" || !profile.approved) {
    throw new Error("Only approved admins can manage delivery settings.");
  }

  const shopId = await getCurrentAdminShopId(profile.id);
  const { data: shop, error: shopError } = await client
    .from("shops")
    .select("name")
    .eq("id", shopId)
    .single();

  if (shopError) {
    throw shopError;
  }

  const { data, error } = await client
    .from("shop_delivery_configs")
    .select(
      "shop_id, origin_address, origin_lat, origin_lng, base_fee_inr, included_distance_km, extra_per_km_inr, max_service_distance_km, is_active",
    )
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error) {
    throw toDeliveryAdminError(error, "Unable to load delivery settings.");
  }

  return mapRowToAdminDeliveryConfig(
    (data ?? null) as SupabaseAdminDeliveryConfigRow | null,
    shopId,
    (shop.name as string | null) ?? "Your shop",
  );
}

export async function upsertAdminDeliveryConfigInSupabase(
  input: Omit<AdminDeliveryConfig, "shopId" | "shopName">,
): Promise<AdminDeliveryConfig> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "admin" || !profile.approved) {
    throw new Error("Only approved admins can manage delivery settings.");
  }

  const shopId = await getCurrentAdminShopId(profile.id);
  const { data: shop, error: shopError } = await client
    .from("shops")
    .select("name")
    .eq("id", shopId)
    .single();

  if (shopError) {
    throw shopError;
  }

  validateAdminDeliveryConfigInput({
    shopId,
    originAddress: input.originAddress,
    originLat: input.originLat,
    originLng: input.originLng,
    baseFeeInr: input.baseFeeInr,
    includedDistanceKm: input.includedDistanceKm,
    extraPerKmInr: input.extraPerKmInr,
    maxServiceDistanceKm: input.maxServiceDistanceKm,
    isActive: input.isActive,
  });

  const { data, error } = await client
    .from("shop_delivery_configs")
    .upsert(
      {
        shop_id: shopId,
        origin_address: input.originAddress.trim(),
        origin_lat: input.originLat,
        origin_lng: input.originLng,
        base_fee_inr: input.baseFeeInr,
        included_distance_km: input.includedDistanceKm,
        extra_per_km_inr: input.extraPerKmInr,
        max_service_distance_km: input.maxServiceDistanceKm,
        is_active: input.isActive,
      },
      { onConflict: "shop_id" },
    )
    .select(
      "shop_id, origin_address, origin_lat, origin_lng, base_fee_inr, included_distance_km, extra_per_km_inr, max_service_distance_km, is_active",
    )
    .single();

  if (error) {
    throw toDeliveryAdminError(error);
  }

  return mapRowToAdminDeliveryConfig(
    data as SupabaseAdminDeliveryConfigRow,
    shopId,
    (shop.name as string | null) ?? "Your shop",
  );
}

export async function fetchAdminCouponsFromSupabase(): Promise<AdminCoupon[]> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "admin" || !profile.approved) {
    throw new Error("Only approved admins can manage coupons.");
  }

  const shopId = await getCurrentAdminShopId(profile.id);
  const applyScope = async (selectClause: string): Promise<AdminCoupon[]> => {
    const { data, error } = await client
      .from("coupons")
      .select(selectClause)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      throw toCouponAdminError(error, "Unable to load coupons.");
    }

    return (data ?? []).map((row) => mapRowToAdminCoupon(row as SupabaseCouponRow));
  };

  try {
    return await applyScope(
      "id, code, description, discount_type, discount_value, min_order_inr, max_discount_inr, valid_from, valid_until, is_active, created_at",
    );
  } catch (issue) {
    if (!isMissingCouponValidityColumnError(issue)) {
      throw issue;
    }

    return applyScope(
      "id, code, description, discount_type, discount_value, min_order_inr, max_discount_inr, starts_at, ends_at, is_active, created_at",
    );
  }
}

export async function createAdminCouponInSupabase(input: {
  code: string;
  description: string;
  discountType: AdminCoupon["discountType"];
  discountValue: number;
  minOrderInr: number;
  maxDiscountInr: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}): Promise<AdminCoupon> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "admin" || !profile.approved) {
    throw new Error("Only approved admins can create coupons.");
  }

  validateAdminCouponInput(input);

  const shopId = await getCurrentAdminShopId(profile.id);
  const normalizedCode = input.code.trim().toUpperCase();
  const basePayload = {
    shop_id: shopId,
    code: normalizedCode,
    description: input.description.trim(),
    discount_type: input.discountType,
    discount_value: input.discountValue,
    min_order_inr: input.minOrderInr,
    max_discount_inr: input.maxDiscountInr,
    is_active: input.isActive,
  };

  const insertAndFetch = async (
    payload: Record<string, string | number | boolean | null>,
    selectClause: string,
  ): Promise<AdminCoupon> => {
    const { data, error } = await client
      .from("coupons")
      .insert(payload)
      .select(selectClause)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A coupon with this code already exists.");
      }
      throw toCouponAdminError(error);
    }

    return mapRowToAdminCoupon(data as SupabaseCouponRow);
  };

  try {
    return await insertAndFetch(
      {
        ...basePayload,
        valid_from: input.validFrom,
        valid_until: input.validUntil,
      },
      "id, code, description, discount_type, discount_value, min_order_inr, max_discount_inr, valid_from, valid_until, is_active, created_at",
    );
  } catch (issue) {
    if (!isMissingCouponValidityColumnError(issue)) {
      throw issue;
    }

    return insertAndFetch(
      {
        ...basePayload,
        starts_at: input.validFrom,
        ends_at: input.validUntil,
      },
      "id, code, description, discount_type, discount_value, min_order_inr, max_discount_inr, starts_at, ends_at, is_active, created_at",
    );
  }
}

export async function placeOrderInSupabase(
  items: CartItem[],
  checkout: CheckoutDetails,
  coupon: CouponResult | null,
): Promise<OrderRecord> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    throw new Error("Sign in to place an order.");
  }

  validateCheckoutInput(checkout);

  const selectedItems = items.filter((item) => item.selected);
  if (!selectedItems.length) {
    throw new Error("Select at least one cart item before checkout.");
  }

  selectedItems.forEach((item) => validateCartProductAvailability(item.product, item.quantity));

  const currentUser = await fetchCurrentUserFromSupabase();
  const { data: createData, error: createError } = await client.functions.invoke<CreateRazorpayOrderResponse>(
    "create-razorpay-order",
    {
      body: {
        couponCode: coupon?.code ?? null,
        deliveryQuoteId: checkout.deliveryQuoteId,
      },
    },
  );

  if (createError) {
    throw new Error(await extractFunctionErrorMessage(createError, "Unable to create the Razorpay checkout session."));
  }

  const checkoutSession = createData;
  if (!checkoutSession) {
    throw new Error("Unable to create the Razorpay checkout session.");
  }

  await loadRazorpayCheckoutScript();
  const key = checkoutSession.key || requireRazorpayKeyId();

  return new Promise<OrderRecord>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay checkout failed to initialize."));
      return;
    }

    const checkoutInstance = new window.Razorpay({
      key,
      amount: checkoutSession.amountPaise,
      currency: checkoutSession.currency,
      name: "HappyPets",
      description: "Complete your HappyPets order",
      order_id: checkoutSession.razorpayOrderId,
      prefill: {
        name: currentUser?.name,
        email: currentUser?.email,
        contact: checkout.mobileNumber,
      },
      notes: {
        address: checkout.address,
        delivery_time: checkout.deliveryTime,
      },
      theme: {
        color: "#2F4F6F",
      },
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
      },
      handler: async (paymentResponse) => {
        try {
          const { data, error } = await client.functions.invoke<VerifyRazorpayPaymentResponse>(
            "verify-razorpay-payment",
            {
              body: {
                ...paymentResponse,
                checkout,
                couponCode: coupon?.code ?? null,
              },
            },
          );

          if (error) {
            throw new Error(await extractFunctionErrorMessage(error, "Unable to verify payment."));
          }

          if (!data?.order) {
            throw new Error("Payment verification completed, but no order was returned.");
          }

          resolve(mapRowToOrder(data.order));
        } catch (issue) {
          reject(issue instanceof Error ? issue : new Error("Unable to verify payment."));
        }
      },
    });

    checkoutInstance.on?.("payment.failed", (response) => {
      reject(new Error(response.error?.description ?? "Payment failed."));
    });

    checkoutInstance.open();
  });
}

export async function fetchOrdersFromSupabase(): Promise<OrderRecord[]> {
  const client = requireSupabaseClient();
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return [];
  }

  let data;

  try {
    const result = await client
      .from("orders")
      .select(ORDER_SELECT)
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false });

    if (result.error) {
      throw result.error;
    }

    data = result.data;
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw issue;
    }

    const legacyResult = await client
      .from("orders")
      .select(LEGACY_ORDER_SELECT)
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false });

    if (legacyResult.error) {
      throw legacyResult.error;
    }

    data = legacyResult.data;
  }

  return (data ?? []).map((row) => mapRowToOrder(row as SupabaseOrderRow));
}

export async function fetchShopLocationsFromSupabase(): Promise<ShopLocation[]> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "superadmin") {
    throw new Error("Only super admins can manage shops.");
  }

  const { data, error } = await client
    .from("shops")
    .select("id, name, slug, status, origin_lat, origin_lng")
    .order("created_at");

  if (error) {
    throw toShopAdminError(error, "Unable to load shops.");
  }

  return ((data ?? []) as SupabaseShopRow[]).map(mapRowToShopLocation);
}

export async function fetchSelectableShopsFromSupabase(): Promise<ShopLocation[]> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    throw new Error("Only admins can load shop selections.");
  }

  let query = client
    .from("shops")
    .select("id, name, slug, status, origin_lat, origin_lng")
    .order("name");

  if (profile.role === "admin") {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) {
    throw toShopAdminError(error, "Unable to load shops.");
  }

  return ((data ?? []) as SupabaseShopRow[]).map(mapRowToShopLocation);
}

export async function createShopLocationInSupabase(
  input: Omit<ShopLocation, "id" | "slug">,
): Promise<ShopLocation> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "superadmin") {
    throw new Error("Only super admins can create shops.");
  }

  validateShopLocationInput(input);

  const baseSlug = buildShopSlug(input.name);
  const shopPayload = {
    admin_id: null,
    name: input.name.trim(),
    slug: `${baseSlug}-${Date.now().toString(36)}`,
    status: input.status,
    origin_lat: input.originLat,
    origin_lng: input.originLng,
  };

  const { data, error } = await client
    .from("shops")
    .insert(shopPayload)
    .select("id, name, slug, status, origin_lat, origin_lng")
    .single();

  if (error) {
    throw toShopAdminError(error);
  }

  const shop = mapRowToShopLocation(data as SupabaseShopRow);

  const { error: configError } = await client.from("shop_delivery_configs").upsert(
    {
      shop_id: shop.id,
      origin_address: input.name.trim(),
      origin_lat: input.originLat,
      origin_lng: input.originLng,
      base_fee_inr: 0,
      included_distance_km: 0,
      extra_per_km_inr: 0,
      max_service_distance_km: 15,
      is_active: input.status === "active",
    },
    { onConflict: "shop_id" },
  );

  if (configError) {
    throw toDeliveryAdminError(configError);
  }

  return shop;
}

export async function updateShopLocationInSupabase(
  shopId: string,
  input: Omit<ShopLocation, "id" | "slug">,
): Promise<ShopLocation> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "superadmin") {
    throw new Error("Only super admins can update shops.");
  }

  validateShopLocationInput(input);

  const { data, error } = await client
    .from("shops")
    .update({
      name: input.name.trim(),
      status: input.status,
      origin_lat: input.originLat,
      origin_lng: input.originLng,
    })
    .eq("id", shopId)
    .select("id, name, slug, status, origin_lat, origin_lng")
    .single();

  if (error) {
    throw toShopAdminError(error);
  }

  const { data: existingConfig } = await client
    .from("shop_delivery_configs")
    .select("shop_id")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (existingConfig?.shop_id) {
    const { error: updateConfigError } = await client
      .from("shop_delivery_configs")
      .update({
        origin_address: input.name.trim(),
        origin_lat: input.originLat,
        origin_lng: input.originLng,
        is_active: input.status === "active",
      })
      .eq("shop_id", shopId);

    if (updateConfigError) {
      throw toDeliveryAdminError(updateConfigError);
    }
  } else {
    const { error: insertConfigError } = await client.from("shop_delivery_configs").insert({
      shop_id: shopId,
      origin_address: input.name.trim(),
      origin_lat: input.originLat,
      origin_lng: input.originLng,
      base_fee_inr: 0,
      included_distance_km: 0,
      extra_per_km_inr: 0,
      max_service_distance_km: 15,
      is_active: input.status === "active",
    });

    if (insertConfigError) {
      throw toDeliveryAdminError(insertConfigError);
    }
  }

  return mapRowToShopLocation(data as SupabaseShopRow);
}

export async function fetchAdminsFromSupabase(): Promise<AdminRecord[]> {
  const client = requireSupabaseClient();
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, email, approved, last_login_at")
    .eq("role", "admin")
    .order("updated_at", { ascending: false });

  if (profileError) {
    throw profileError;
  }

  const adminIds = (profiles ?? []).map((profile) => profile.id as string);
  let requests: SupabaseAdminRequestRow[] = [];

  if (adminIds.length) {
    const { data, error } = await client
      .from("admin_requests")
      .select("user_id, status")
      .in("user_id", adminIds);

    if (error) {
      throw error;
    }

    requests = (data ?? []) as SupabaseAdminRequestRow[];
  }

  const requestsByUser = new Map(requests.map((request) => [request.user_id, request.status]));

  return (profiles ?? []).map((profile) => {
    const requestStatus = requestsByUser.get(profile.id as string);
    const status =
      requestStatus === "pending"
        ? "Pending"
        : requestStatus === "rejected"
          ? "Rejected"
          : requestStatus === "revoked"
            ? "Revoked"
            : profile.approved
              ? "Approved"
              : "Pending";

    return {
      id: profile.id as string,
      name: (profile.full_name as string | null) ?? deriveNameFromEmail((profile.email as string) ?? "admin"),
      email: (profile.email as string) ?? "unknown@happypets.com",
      status,
      leaveDays: 0,
      lastLogin: profile.last_login_at ? String(profile.last_login_at).slice(0, 10) : "Never",
    };
  });
}

async function updateAdminState(
  adminId: string,
  status: "approved" | "rejected" | "revoked",
): Promise<void> {
  const client = requireSupabaseClient();
  const approved = status === "approved";

  const { error: profileError } = await client
    .from("profiles")
    .update({ approved })
    .eq("id", adminId)
    .eq("role", "admin");

  if (profileError) {
    throw profileError;
  }

  const { error: requestError } = await client.from("admin_requests").upsert(
    {
      user_id: adminId,
      status,
      reviewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (requestError) {
    throw requestError;
  }

  const nextShopStatus = status === "approved" ? "active" : status === "revoked" ? "suspended" : "pending";
  const { error: shopError } = await client
    .from("shops")
    .update({ status: nextShopStatus })
    .eq("admin_id", adminId);

  if (shopError) {
    throw shopError;
  }

  if (status === "revoked") {
    const { data: shops, error: shopSelectError } = await client
      .from("shops")
      .select("id")
      .eq("admin_id", adminId);

    if (shopSelectError) {
      throw shopSelectError;
    }

    const shopIds = (shops ?? []).map((shop) => shop.id as string);
    if (shopIds.length) {
      const { error: productError } = await client
        .from("products")
        .update({ is_active: false })
        .in("shop_id", shopIds);

      if (productError) {
        throw productError;
      }
    }
  }
}

export async function approveAdminInSupabase(adminId: string): Promise<void> {
  await updateAdminState(adminId, "approved");
}

export async function rejectAdminInSupabase(adminId: string): Promise<void> {
  await updateAdminState(adminId, "rejected");
}

export async function revokeAdminInSupabase(adminId: string): Promise<void> {
  await updateAdminState(adminId, "revoked");
}
