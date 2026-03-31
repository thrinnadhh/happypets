import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";

export function SupportPage(): JSX.Element {
  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Support</p>
            <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Get help quickly</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              This protected support route is ready for chat, ticketing, or FAQ integrations.
            </p>
          </div>
          <div className="card p-8">
            <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Response targets</p>
            <div className="mt-6 grid gap-4">
              {[
                ["Order support", "Under 30 minutes"],
                ["Product questions", "Under 2 hours"],
                ["Returns and refunds", "Same day"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] bg-[#faf5ea] px-4 py-4">
                  <p className="text-sm text-slate-600">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
