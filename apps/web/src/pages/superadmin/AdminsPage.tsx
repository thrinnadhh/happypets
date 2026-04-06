import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { DataTable } from "@/components/tables/DataTable";
import { usePlatform } from "@/contexts/PlatformContext";
import { superAdminLinks } from "@/pages/superadmin/navigation";

export function SuperAdminAdminsPage(): JSX.Element {
  const { admins, approveAdmin, revokeAdmin } = usePlatform();

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[300px_1fr]">
        <Sidebar title="Admin Management" subtitle="Super Admin" links={superAdminLinks} />

        <div className="space-y-6">
          <section className="card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Admin Management</p>
            <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Approve or revoke admin access</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Review admin status, inactivity patterns, and account approvals without exposing any catalog editing controls.
            </p>
          </section>

          <DataTable
            rows={admins}
            columns={[
              {
                key: "name",
                title: "Admin Name",
                render: (admin) => (
                  <div>
                    <p className="font-semibold text-ink">{admin.name}</p>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                  </div>
                ),
              },
              {
                key: "status",
                title: "Status",
                render: (admin) => (
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                    {admin.status}
                  </span>
                ),
              },
              {
                key: "lastLogin",
                title: "Last Login",
                render: (admin) => admin.lastLogin,
              },
              {
                key: "leaveDays",
                title: "Leave Days",
                render: (admin) => `${admin.leaveDays} days`,
              },
              {
                key: "actions",
                title: "Actions",
                render: (admin) => (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveAdmin(admin.id)}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => revokeAdmin(admin.id)}
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                    >
                      {admin.status === "Pending" ? "Reject" : "Revoke"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>
    </PageTransition>
  );
}
