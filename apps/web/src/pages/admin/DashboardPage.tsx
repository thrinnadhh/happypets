import { motion } from "framer-motion";
import { EmptyState } from "@/components/common/EmptyState";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { summaryCards } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { adminLinks } from "@/pages/admin/navigation";

export function AdminDashboardPage(): JSX.Element {
  const { user } = useAuth();

  return (
    <PageTransition className="min-h-screen bg-page">
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 md:py-8 xl:grid-cols-[260px_1fr]">
        <Sidebar title="Admin Workspace" subtitle="Admin" links={adminLinks} />

        <div className="space-y-5">
          {!user?.approved ? (
            <EmptyState
              icon="⏳"
              title="Pending Approval"
              description="Your admin account is waiting for super admin approval. Product management stays locked until approved."
            />
          ) : null}

          <section className="card p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">Store Operations 🏪</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Review the live catalog pulse, manage inventory, and handle orders.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 transition"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">{item.label}</p>
                  <p className="mt-3 text-2xl font-extrabold text-ink">{item.value}</p>
                  <p className="mt-1 text-xs text-muted">{item.detail}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="card p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Daily Focus</p>
              <div className="mt-4 space-y-3">
                {[
                  ["🧹 Catalog hygiene", "Review expiring batches and low-stock items before editing active products."],
                  ["💰 Pricing review", "Check discount usage so margin-heavy products do not dominate the catalog."],
                  ["🖼️ Image quality", "Use Supabase upload to keep product imagery consistent across views."],
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-bold text-ink">{title}</p>
                    <p className="mt-1 text-xs leading-6 text-muted">{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Workspace Status</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-brand-50/50 p-4">
                  <p className="text-xs text-muted">Account State</p>
                  <p className="mt-2 text-xl font-extrabold text-ink">
                    {user?.approved ? "✅ Approved Admin" : "⏳ Pending Approval"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-muted">Permissions</p>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    Admin access includes dashboard monitoring and product CRUD. Super admin analytics remain isolated.
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
