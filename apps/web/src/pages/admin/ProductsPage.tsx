import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FloatingActionButton } from "@/components/common/FloatingActionButton";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { DataTable } from "@/components/tables/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { displaySectionLabels, getCategoryLabel, productTagLabels, sortProductsByPosition } from "@/data/catalog";
import { formatInr } from "@/lib/commerce";
import { fetchSelectableShopsFromSupabase } from "@/lib/supabase";
import { adminLinks } from "@/pages/admin/navigation";
import { Product, ProductCategory, ShopLocation } from "@/types";

export function AdminProductsPage(): JSX.Element {
  const { user } = useAuth();
  const { products, loading, createProduct, updateProduct, deleteProduct } = useCatalog();
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [availableShops, setAvailableShops] = useState<ShopLocation[]>([]);
  const discountedCount = products.filter((product) => product.discount).length;
  const lowStockCount = products.filter((product) => product.quantity < 20).length;
  const homeCount = products.filter((product) => product.displaySection === "Home").length;
  const taggedCount = products.filter((product) => product.tags?.length).length;
  const sampleCount = products.filter((product) => product.isSample).length;
  const orderedProducts = sortProductsByPosition(products).sort((left, right) => {
    if (left.displaySection !== right.displaySection) {
      return left.displaySection.localeCompare(right.displaySection);
    }

    return left.position - right.position;
  });
  const existingBrandsByCategory = useMemo(() => {
    return products.reduce<Record<ProductCategory, string[]>>((accumulator, product) => {
      const current = accumulator[product.category] ?? [];
      if (product.brand.trim() && !current.includes(product.brand.trim())) {
        current.push(product.brand.trim());
      }
      accumulator[product.category] = current.sort((left, right) => left.localeCompare(right));
      return accumulator;
    }, {
      Dog: [],
      Cat: [],
      Fish: [],
      Hamster: [],
      Rabbit: [],
      Birds: [],
    });
  }, [products]);

  useEffect(() => {
    if (!user?.approved) {
      return;
    }

    void fetchSelectableShopsFromSupabase()
      .then(setAvailableShops)
      .catch(() => setAvailableShops([]));
  }, [user?.approved]);

  if (loading) {
    return <Loader label="Loading product manager..." />;
  }

  return (
    <PageTransition className="min-h-screen bg-page">
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 md:py-8 xl:grid-cols-[260px_1fr]">
        <Sidebar title="Product Management" subtitle="Admin" links={adminLinks} />

        <div className="space-y-5">
          {!user?.approved ? (
            <EmptyState
              icon="⏳"
              title="Pending Approval"
              description="Your account is pending approval, so product CRUD is locked."
            />
          ) : (
            <>
              <section className="card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Products</p>
                    <h1 className="mt-2 text-3xl font-extrabold text-ink">Manage Product Catalog 📦</h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted">
                      Create, edit, and organise products with Supabase-ready image upload and tag-based highlighting.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setOpen(true);
                    }}
                    className="btn-primary"
                  >
                    + Add Product
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ["📦", "Products", `${products.length}`],
                    ["🏠", "Home Placements", `${homeCount}`],
                    ["🏷️", "Tagged", `${taggedCount}`],
                    ["💰", "Discounted", `${discountedCount}`],
                    ["⚠️", "Low Stock", `${lowStockCount}`],
                    ["🎁", "Samples", `${sampleCount}`],
                  ].map(([emoji, label, value]) => (
                    <div key={label} className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted">{emoji} {label}</p>
                      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {products.length ? (
                <DataTable
                  rows={orderedProducts}
                  columns={[
                    {
                      key: "name",
                      title: "Product",
                      render: (product) => (
                        <div>
                          <p className="font-semibold text-ink">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.brand}</p>
                        </div>
                      ),
                    },
                    {
                      key: "category",
                      title: "Category",
                      render: (product) => getCategoryLabel(product.category),
                    },
                    {
                      key: "lifeStage",
                      title: "Stage",
                      render: (product) => product.lifeStage || "—",
                    },
                    {
                      key: "displaySection",
                      title: "Display Section",
                      render: (product) =>
                        product.displaySection === "Home" ? "Home" : displaySectionLabels[product.displaySection],
                    },
                    {
                      key: "position",
                      title: "Position",
                      render: (product) => product.position,
                    },
                    {
                      key: "tags",
                      title: "Tags",
                      render: (product) =>
                        product.tags?.length
                          ? product.tags.map((tag) => productTagLabels[tag]).join(", ")
                          : "None",
                    },
                    {
                      key: "shops",
                      title: "Fulfillment Shops",
                      render: (product) =>
                        product.shopInventories?.length
                          ? product.shopInventories.map((inventory) => `${inventory.shopName} (${inventory.stockQuantity})`).join(", ")
                          : "Primary shop only",
                    },
                    {
                      key: "quantity",
                      title: "Quantity",
                      render: (product) => product.quantity,
                    },
                    {
                      key: "price",
                      title: "Price",
                      render: (product) => formatInr(product.price),
                    },
                    {
                      key: "weight",
                      title: "Pack",
                      render: (product) => `${product.weight} • ${product.packetCount}`,
                    },
                    {
                      key: "sample",
                      title: "Sample",
                      render: (product) => (product.isSample ? "Yes" : "No"),
                    },
                    {
                      key: "actions",
                      title: "Actions",
                      render: (product) => (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setOpen(true);
                            }}
                            className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              void deleteProduct(product.id);
                            }}
                            className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                          >
                            Delete
                          </button>
                        </div>
                      ),
                    },
                  ]}
                />
              ) : (
                <EmptyState
                  title="No products yet"
                  description="Create your first product from the floating add button and it will appear in both the admin table and customer catalog."
                />
              )}
            </>
          )}
        </div>
      </main>

      {user?.approved ? (
        <FloatingActionButton
          label="Create product"
          onClick={() => {
            setEditingProduct(null);
            setOpen(true);
          }}
        />
      ) : null}

      <ProductFormModal
        open={open}
        product={editingProduct}
        availableShops={availableShops}
        existingBrandsByCategory={existingBrandsByCategory}
        onClose={() => setOpen(false)}
        onSave={async (input) => {
          if (editingProduct) {
            await updateProduct(editingProduct.id, input);
            return;
          }

          await createProduct(input);
        }}
      />
    </PageTransition>
  );
}
