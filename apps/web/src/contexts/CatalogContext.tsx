import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchProducts } from "@/api/mockApi";
import { defaultProducts } from "@/data/mockData";
import { Product } from "@/types";
import { deleteProductFromSupabase, upsertProductInSupabase } from "@/lib/supabase";

type ProductInput = Omit<Product, "id" | "soldCount" | "revenue">;

type CatalogContextValue = {
  products: Product[];
  loading: boolean;
  createProduct: (input: ProductInput) => Promise<void>;
  updateProduct: (id: string, input: ProductInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (productId: string) => Product | undefined;
  getRelatedProducts: (productId: string) => Product[];
};

const STORAGE_KEY = "happypets-products";
const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    rating: typeof product.rating === "number" ? product.rating : 4.8,
    gallery:
      product.gallery?.length
        ? product.gallery
        : product.image
          ? [product.image]
          : [],
    soldCount: typeof product.soldCount === "number" ? product.soldCount : 0,
    revenue: typeof product.revenue === "number" ? product.revenue : 0,
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const initial = raw ? (JSON.parse(raw) as Product[]) : defaultProducts;

    fetchProducts(initial)
      .then((response) => setProducts(response.map(normalizeProduct)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [loading, products]);

  const createProduct = async (input: ProductInput): Promise<void> => {
    const nextProduct: Product = {
      ...input,
      id: `${input.category.toLowerCase()}-${Date.now()}`,
      soldCount: 0,
      revenue: 0,
    };

    const normalized = normalizeProduct(nextProduct);
    setProducts((current) => [normalized, ...current]);
    await upsertProductInSupabase(normalized);
  };

  const updateProduct = async (id: string, input: ProductInput): Promise<void> => {
    const existing = products.find((product) => product.id === id);
    if (!existing) return;

    const nextProduct: Product = {
      ...existing,
      ...input,
    };

    const normalized = normalizeProduct(nextProduct);
    setProducts((current) => current.map((product) => (product.id === id ? normalized : product)));
    await upsertProductInSupabase(normalized);
  };

  const deleteProduct = async (id: string): Promise<void> => {
    setProducts((current) => current.filter((product) => product.id !== id));
    await deleteProductFromSupabase(id);
  };

  const getProductById = (productId: string): Product | undefined =>
    products.find((product) => product.id === productId);

  const getRelatedProducts = (productId: string): Product[] => {
    const base = getProductById(productId);
    if (!base) return [];

    return products.filter((product) => product.category === base.category && product.id !== productId);
  };

  const value = useMemo(
    () => ({
      products,
      loading,
      createProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      getRelatedProducts,
    }),
    [loading, products],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error("useCatalog must be used inside CatalogProvider");
  }

  return context;
}
