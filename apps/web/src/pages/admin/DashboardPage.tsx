import { motion } from "framer-motion";
import { EmptyState } from "@/components/common/EmptyState";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { summaryCards } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
];

export function AdminDashboardPage(): JSX.Element {
  const { user } = useAuth();

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[280px_1fr]">
        <Sidebar title="Admin Workspace" subtitle="Admin" links={adminLinks} />

        <div className="space-y-6">
          {!user?.approved ? (
            <EmptyState
              title="Pending Approval"
              description="Your admin account is waiting for super admin approval. You can view this dashboard status, but product management stays locked until approval."
            />
          ) : null}

          <section className="card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Dashboard</p>
            <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Store operations overview</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Review the live catalog pulse, spot discount-heavy inventory, and move into product operations without exposing any super admin controls.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => (
                <motion.div key={item.label} whileHover={{ y: -5 }} className="stat-panel">
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="mt-4 text-3xl font-semibold text-ink">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="card p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Daily Focus</p>
              <div className="mt-6 space-y-4">
                {[
                  ["Catalog hygiene", "Review expiring batches and low-stock items before editing active products."],
                  ["Pricing review", "Check discount usage so margin-heavy products do not dominate the catalog."],
                  ["Image quality", "Use Supabase upload to keep product imagery consistent across customer and admin views."],
                ].map(([title, copy]) => (
                  <div key={title} className="subtle-panel p-5">
                    <p className="text-base font-semibold text-ink">{title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-500">{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Workspace Status</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] bg-[#faf5ea] p-5">
                  <p className="text-sm text-slate-500">Account state</p>
                  <p className="mt-3 text-2xl font-semibold text-ink">
                    {user?.approved ? "Approved admin" : "Pending approval"}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#f7f1e6] p-5">
                  <p className="text-sm text-slate-500">Permissions</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Admin access includes dashboard monitoring and product CRUD only. Super admin analytics and admin management remain isolated.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
