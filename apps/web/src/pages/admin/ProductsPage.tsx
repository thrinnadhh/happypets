import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { FloatingActionButton } from "@/components/common/FloatingActionButton";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { DataTable } from "@/components/tables/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { Product } from "@/types";

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
];

export function AdminProductsPage(): JSX.Element {
  const { user } = useAuth();
  const { products, loading, createProduct, updateProduct, deleteProduct } = useCatalog();
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const discountedCount = products.filter((product) => product.discount).length;
  const lowStockCount = products.filter((product) => product.quantity < 20).length;

  if (loading) {
    return <Loader label="Loading product manager..." />;
  }

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[280px_1fr]">
        <Sidebar title="Product Management" subtitle="Admin" links={adminLinks} />

        <div className="space-y-6">
          {!user?.approved ? (
            <EmptyState
              title="Pending Approval"
              description="Your account is pending approval, so product CRUD is locked. Once approved, the floating add button and modal form will become active."
            />
          ) : (
            <>
              <section className="card p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Products</p>
                    <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Manage product catalog</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                      Product creation stays in admin-only routes, with Supabase-ready image upload, preview, and pricing controls.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setOpen(true);
                    }}
                    className="primary-button"
                  >
                    Add Product
                  </button>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {[
                    ["Products", `${products.length}`],
                    ["Discounted SKUs", `${discountedCount}`],
                    ["Low stock", `${lowStockCount}`],
                  ].map(([label, value]) => (
                    <div key={label} className="stat-panel">
                      <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{label}</p>
                      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {products.length ? (
                <DataTable
                  rows={products}
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
                      render: (product) => product.category,
                    },
                    {
                      key: "quantity",
                      title: "Quantity",
                      render: (product) => product.quantity,
                    },
                    {
                      key: "price",
                      title: "Price",
                      render: (product) => `$${product.price.toFixed(2)}`,
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
