import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRODUCT_POSITION,
  getDefaultDisplaySection,
  normalizeLifeStage,
  sortProductsByPosition,
  sortTags,
} from "@/data/catalog";
import { Product } from "@/types";
import {
  createProductInSupabase,
  deleteProductFromSupabase,
  fetchProductsFromSupabase,
  isSupabaseConfigured,
  updateProductInSupabase,
} from "@/lib/supabase";

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

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    lifeStage: normalizeLifeStage(
      product.category,
      product.lifeStage ?? "",
      `${product.name} ${product.description ?? ""}`,
    ),
    displaySection: product.displaySection ?? getDefaultDisplaySection(product.category),
    position:
      typeof product.position === "number" && Number.isFinite(product.position) && product.position > 0
        ? product.position
        : DEFAULT_PRODUCT_POSITION,
    tags: sortTags(product.tags ?? []),
    rating: typeof product.rating === "number" ? product.rating : 4.8,
    weight: product.weight ?? "",
    packetCount: typeof product.packetCount === "number" ? product.packetCount : 1,
    isSample: Boolean(product.isSample),
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
    const loadProducts = async (): Promise<void> => {
      try {
        const sourceProducts = isSupabaseConfigured ? await fetchProductsFromSupabase() : [];
        const normalized = sourceProducts.map(normalizeProduct);
        startTransition(() => {
          setProducts(sortProductsByPosition(normalized));
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const createProduct = async (input: ProductInput): Promise<void> => {
    const created = normalizeProduct(await createProductInSupabase(input));
    startTransition(() => {
      setProducts((current) => sortProductsByPosition([...current, created]));
    });
  };

  const updateProduct = async (id: string, input: ProductInput): Promise<void> => {
    const updated = normalizeProduct(await updateProductInSupabase(id, input));
    startTransition(() => {
      setProducts((current) =>
        sortProductsByPosition(
          current.map((product) => (product.id === id ? updated : product)),
        ),
      );
    });
  };

  const deleteProduct = async (id: string): Promise<void> => {
    await deleteProductFromSupabase(id);
    startTransition(() => {
      setProducts((current) => current.filter((product) => product.id !== id));
    });
  };

  const getProductById = (productId: string): Product | undefined =>
    products.find((product) => product.id === productId);

  const getRelatedProducts = (productId: string): Product[] => {
    const base = getProductById(productId);
    if (!base) return [];

    return sortProductsByPosition(
      products.filter((product) => product.category === base.category && product.id !== productId),
    ).slice(0, 8);
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
