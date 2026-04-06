import { motion } from "framer-motion";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCatalog } from "@/contexts/CatalogContext";
import { formatInr } from "@/lib/commerce";
import { superAdminLinks } from "@/pages/superadmin/navigation";

export function SuperAdminDashboardPage(): JSX.Element {
  const { products } = useCatalog();

  const totalRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const topSelling = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 3);

  return (
    <PageTransition className="min-h-screen bg-page">
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 md:py-8 xl:grid-cols-[260px_1fr]">
        <Sidebar title="Super Admin" subtitle="Platform" links={superAdminLinks} />

        <div className="space-y-5">
          <section className="card p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Super Admin</p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">Platform Overview 🌐</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Admin governance, revenue oversight, and platform-wide decisions — separated from product CRUD.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["💰", "Total Revenue", formatInr(totalRevenue)],
                ["📦", "Products Tracked", `${products.length}`],
                ["🏆", "Top Seller", topSelling[0]?.name ?? "N/A"],
              ].map(([emoji, label, value]) => (
                <motion.div
                  key={label}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="rounded-xl border border-brand-100 bg-brand-50/50 p-5 transition"
                >
                  <p className="text-xl">{emoji}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
                  <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Top Performers</p>
            <h2 className="mt-2 text-xl font-extrabold text-ink">Best Selling Products 🏆</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {topSelling.map((product, i) => (
                <div key={product.id} className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                    <span className="text-xs font-bold text-muted">{product.brand}</span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-ink">{product.name}</p>
                  <p className="mt-1 text-xs text-muted">{product.soldCount} units sold</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
