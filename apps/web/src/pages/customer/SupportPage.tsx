import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";

const supportItems = [
  { emoji: "⚡", label: "Order support",      value: "< 30 minutes" },
  { emoji: "❓", label: "Product questions",   value: "< 2 hours" },
  { emoji: "↩️", label: "Returns & refunds",   value: "Same day" },
];

export function SupportPage(): JSX.Element {
  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <section className="card p-6 mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Help Centre</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">Get Help Quickly 💬</h1>
          <p className="mt-2 text-sm text-muted">
            Our support team is ready to assist with orders, products, and returns.
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          {supportItems.map(({ emoji, label, value }) => (
            <div key={label} className="card p-5 text-center hover:shadow-glow transition-all cursor-pointer">
              <span className="text-3xl">{emoji}</span>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
              <p className="mt-1 text-base font-extrabold text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/40 p-5">
          <p className="text-sm font-bold text-ink">Chat with us 🐾</p>
          <p className="mt-1 text-sm text-muted">
            Live chat, ticketing, and FAQ integrations can be connected here. Your support route is protected and ready.
          </p>
          <button className="btn-primary mt-4">Start a Conversation</button>
        </div>
      </main>
    </PageTransition>
  );
}
