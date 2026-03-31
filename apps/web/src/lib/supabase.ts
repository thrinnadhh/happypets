import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Product } from "@/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseBucket = import.meta.env.VITE_SUPABASE_BUCKET ?? "product-images";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export async function uploadImageToSupabase(
  file: File,
  onProgress?: (value: number) => void,
): Promise<string> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable uploads.",
    );
  }

  let progress = 8;
  onProgress?.(progress);

  const interval = window.setInterval(() => {
    progress = Math.min(progress + 12, 90);
    onProgress?.(progress);
  }, 120);

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage.from(supabaseBucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  window.clearInterval(interval);

  if (error) {
    onProgress?.(0);
    throw error;
  }

  const { data } = supabase.storage.from(supabaseBucket).getPublicUrl(path);
  onProgress?.(100);
  return data.publicUrl;
}

export async function upsertProductInSupabase(product: Product): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("products").upsert({
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    image: product.image,
    gallery: product.gallery ?? [],
    description: product.description,
    quantity: product.quantity,
    price: product.price,
    discount: product.discount ?? null,
    manufacture_date: product.manufactureDate,
    expiry_date: product.expiryDate,
    sold_count: product.soldCount,
    revenue: product.revenue,
    rating: product.rating,
  });

  if (error) {
    throw error;
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    throw error;
  }
}
