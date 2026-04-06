import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";

export function ContactPage(): JSX.Element {
  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <section className="card p-6 mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Contact</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">Talk to the HappyPets Team 🐾</h1>
          <p className="mt-2 text-sm text-muted">We'd love to hear from you!</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { emoji: "📞", label: "Phone",   value: "+91 98765 43210" },
            { emoji: "✉️", label: "Email",   value: "support@happypets.com" },
            { emoji: "📍", label: "Address", value: "Bengaluru, India" },
          ].map(({ emoji, label, value }) => (
            <div key={label} className="card p-5 text-center">
              <span className="text-3xl">{emoji}</span>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </main>
    </PageTransition>
  );
}
