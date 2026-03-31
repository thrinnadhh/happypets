import { createClient, Session, SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";
import {
  DEFAULT_PRODUCT_POSITION,
  getCategoryFromSlug,
  getDefaultDisplaySection,
  productCategories,
  sortTags,
} from "@/data/catalog";
import {
  AdminRecord,
  Banner,
  CartItem,
  CheckoutDetails,
  CouponResult,
  LoginPayload,
  OrderItem,
  OrderRecord,
  Product,
  ProductCategory,
  SignupPayload,
  SignupResult,
  User,
} from "@/types";
import { calculateDiscountedPrice } from "@/lib/commerce";

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
  code: string;
  description: string | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_inr: number | null;
  max_discount_inr: number | null;
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
};

type VerifyRazorpayPaymentResponse = {
  order: SupabaseOrderRow;
};

const PRODUCT_SELECT = `
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

  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    category,
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

function mapRowToBanner(row: SupabaseBannerRow): Banner {
  return {
    id: row.id,
    imageUrl: row.image_url,
    position: row.position as Banner["position"],
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
    address: row.delivery_address ?? "",
    mobileNumber: row.mobile_number ?? "",
    deliveryTime: row.delivery_time ?? "",
    createdAt: row.created_at,
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
    .or(`name.eq.${category},slug.eq.${category.toLowerCase()}`)
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

function buildOrderNumber(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HPT-${date}-${suffix}`;
}

function isMissingProductEnhancementColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return ["weight", "packet_count", "is_sample"].some((column) => message.includes(column));
}

function isMissingCartEnhancementColumnError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";
  return message.includes("selected") || isMissingProductEnhancementColumnError(issue);
}

function isMissingRowError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }

  const code = "code" in issue && typeof issue.code === "string" ? issue.code : "";
  const message = "message" in issue && typeof issue.message === "string" ? issue.message.toLowerCase() : "";

  return code === "PGRST116" || message.includes("0 rows") || message.includes("no rows");
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
      throw issue;
    }

    return attempt(LEGACY_PRODUCT_SELECT);
  }
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

  try {
    return await attempt(PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw issue;
    }

    return attempt(LEGACY_PRODUCT_SELECT);
  }
}

export async function uploadImageToSupabase(
  file: File,
  onProgress?: (value: number) => void,
): Promise<string> {
  const client = requireSupabaseClient();

  let progress = 8;
  onProgress?.(progress);

  const interval = window.setInterval(() => {
    progress = Math.min(progress + 12, 90);
    onProgress?.(progress);
  }, 120);

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await client.storage.from(supabaseBucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  window.clearInterval(interval);

  if (error) {
    onProgress?.(0);
    throw error;
  }

  const { data } = client.storage.from(supabaseBucket).getPublicUrl(path);
  onProgress?.(100);
  return data.publicUrl;
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

    return (data ?? []).map((row) => mapRowToProduct(row as SupabaseProductRow));
  };

  try {
    return await applyScope(PRODUCT_SELECT);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw issue;
    }

    return applyScope(LEGACY_PRODUCT_SELECT);
  }
}

export async function createProductInSupabase(
  product: Omit<Product, "id" | "soldCount" | "revenue">,
): Promise<Product> {
  const client = requireSupabaseClient();
  const profile = await getCurrentProfileRow();

  if (!profile || profile.role !== "admin" || !profile.approved) {
    throw new Error("Only approved admins can create products.");
  }

  const [categoryId, shopId] = await Promise.all([
    resolveCategoryId(product.category),
    getCurrentAdminShopId(profile.id),
  ]);

  const basePayload = {
    shop_id: shopId,
    category_id: categoryId,
    name: product.name,
    slug: buildProductSlug(product.name),
    description: product.description,
    price_inr: product.price,
    compare_at_price: null,
    stock_quantity: product.quantity,
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
    ...basePayload,
    weight: product.weight,
    packet_count: product.packetCount,
    is_sample: product.isSample,
  };

  const insertProduct = async (payload: typeof enhancedPayload | typeof basePayload): Promise<string> => {
    const { data, error } = await client.from("products").insert(payload).select("id").single();

    if (error) {
      throw error;
    }

    return data.id as string;
  };

  try {
    return fetchProductById(await insertProduct(enhancedPayload));
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw issue;
    }

    return fetchProductById(await insertProduct(basePayload));
  }
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

  const categoryId = await resolveCategoryId(product.category);

  const basePayload = {
    category_id: categoryId,
    name: product.name,
    description: product.description,
    price_inr: product.price,
    stock_quantity: product.quantity,
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
    ...basePayload,
    weight: product.weight,
    packet_count: product.packetCount,
    is_sample: product.isSample,
  };

  const updateProduct = async (payload: typeof enhancedPayload | typeof basePayload): Promise<void> => {
    const { error } = await client.from("products").update(payload).eq("id", productId);

    if (error) {
      throw error;
    }
  };

  try {
    await updateProduct(enhancedPayload);
  } catch (issue) {
    if (!isMissingProductEnhancementColumnError(issue)) {
      throw issue;
    }

    await updateProduct(basePayload);
  }

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
    throw error;
  }

  return (data ?? []).map((row) => mapRowToBanner(row as SupabaseBannerRow));
}

export async function saveBannerInSupabase(input: Omit<Banner, "id"> & { id?: string }): Promise<Banner> {
  const client = requireSupabaseClient();
  const payload = {
    id: input.id,
    image_url: input.imageUrl,
    position: input.position,
  };

  const { data, error } = await client
    .from("banners")
    .upsert(payload, { onConflict: "position" })
    .select("id, image_url, position")
    .single();

  if (error) {
    throw error;
  }

  return mapRowToBanner(data as SupabaseBannerRow);
}

export async function deleteBannerFromSupabase(bannerId: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from("banners").delete().eq("id", bannerId);

  if (error) {
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

  try {
    await fetchProductById(productId);
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

  if (existing) {
    try {
      const { error } = await client
        .from("cart_items")
        .update({ quantity: existing.quantity + normalizedQuantity, selected: true })
        .eq("id", existing.id);

      if (error) {
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
    nextPayload.quantity = Math.max(1, input.quantity);
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
  const { data, error } = await client
    .from("coupons")
    .select("code, description, discount_type, discount_value, min_order_inr, max_discount_inr")
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .lte("valid_from", now)
    .gte("valid_until", now)
    .maybeSingle();

  if (error) {
    throw error;
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

  const selectedItems = items.filter((item) => item.selected);
  if (!selectedItems.length) {
    throw new Error("Select at least one cart item before checkout.");
  }

  const currentUser = await fetchCurrentUserFromSupabase();
  const { data: createData, error: createError } = await client.functions.invoke<CreateRazorpayOrderResponse>(
    "create-razorpay-order",
    {
      body: {
        couponCode: coupon?.code ?? null,
      },
    },
  );

  if (createError) {
    throw createError;
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
            throw error;
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

  const { data, error } = await client
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRowToOrder(row as SupabaseOrderRow));
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
