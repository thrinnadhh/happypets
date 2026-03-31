import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";

export function ContactPage(): JSX.Element {
  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <section className="card p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Contact</p>
          <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Talk to the HappyPets team</h1>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Phone", "+91 98765 43210"],
              ["Email", "support@happypets.com"],
              ["Address", "Bengaluru, India"],
            ].map(([label, value]) => (
              <div key={label} className="stat-panel">
                <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-3 text-lg font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
