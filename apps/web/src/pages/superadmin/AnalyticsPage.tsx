import { motion } from "framer-motion";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCatalog } from "@/contexts/CatalogContext";
import { productCategories } from "@/data/catalog";
import { formatInr } from "@/lib/commerce";
import { superAdminLinks } from "@/pages/superadmin/navigation";

export function SuperAdminAnalyticsPage(): JSX.Element {
  const { products } = useCatalog();

  const byRevenue = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const bySales = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 4);
  const totalRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const categoryPerformance = productCategories.map((category) => {
    const categoryProducts = products.filter((product) => product.category === category);
    return {
      category,
      revenue: categoryProducts.reduce((sum, product) => sum + product.revenue, 0),
    };
  });
  const maxCategoryRevenue = Math.max(...categoryPerformance.map((item) => item.revenue), 1);

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[300px_1fr]">
        <Sidebar title="Analytics" subtitle="Super Admin" links={superAdminLinks} />

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Top selling products", `${bySales.length}`],
              ["Highest revenue products", `${byRevenue.length}`],
              ["Total revenue", formatInr(totalRevenue)],
            ].map(([label, value]) => (
              <motion.div key={label} whileHover={{ y: -5 }} className="card p-6">
                <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
              </motion.div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card p-8">
              <h2 className="font-heading text-4xl font-semibold text-ink">Top selling products</h2>
              <div className="mt-6 space-y-3">
                {bySales.map((product) => (
                  <div key={product.id} className="rounded-[22px] bg-[#f9f6f0] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-ink">{product.name}</span>
                      <span className="text-sm text-slate-500">{product.soldCount} sold</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-8">
              <h2 className="font-heading text-4xl font-semibold text-ink">Highest revenue products</h2>
              <div className="mt-6 space-y-3">
                {byRevenue.map((product) => (
                  <div key={product.id} className="rounded-[22px] bg-[#faf5ea] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-ink">{product.name}</span>
                      <span className="text-sm text-slate-500">{formatInr(product.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card p-8">
            <h2 className="font-heading text-4xl font-semibold text-ink">Category performance</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {categoryPerformance.map((item) => (
                <div key={item.category} className="rounded-[24px] bg-[#faf5ea] p-5">
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{item.category}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(item.revenue / maxCategoryRevenue) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-[#2F4F6F]"
                    />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-ink">{formatInr(item.revenue)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
