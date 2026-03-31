import { motion } from "framer-motion";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCatalog } from "@/contexts/CatalogContext";

const links = [
  { to: "/superadmin/dashboard", label: "Dashboard" },
  { to: "/superadmin/admins", label: "Admin Management" },
  { to: "/superadmin/analytics", label: "Analytics" },
];

export function SuperAdminDashboardPage(): JSX.Element {
  const { products } = useCatalog();

  const totalRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const topSelling = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 3);

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[300px_1fr]">
        <Sidebar title="Super Admin" subtitle="Platform" links={links} />

        <div className="space-y-6">
          <section className="card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Super Admin Dashboard</p>
            <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Platform overview and control</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              This workspace is intentionally separated from product CRUD. It focuses on admin governance, revenue oversight, and platform-wide decisions.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Total revenue", `$${totalRevenue.toLocaleString()}`],
                ["Products tracked", `${products.length}`],
                ["Top seller", topSelling[0]?.name ?? "N/A"],
              ].map(([label, value]) => (
                <motion.div key={label} whileHover={{ y: -5 }} className="stat-panel">
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="card p-8">
            <h2 className="font-heading text-4xl font-semibold text-ink">Top selling products</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {topSelling.map((product) => (
                <div key={product.id} className="rounded-[24px] bg-[#faf5ea] p-5">
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{product.brand}</p>
                  <p className="mt-2 text-xl font-semibold text-ink">{product.name}</p>
                  <p className="mt-3 text-sm text-slate-600">{product.soldCount} units sold</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
