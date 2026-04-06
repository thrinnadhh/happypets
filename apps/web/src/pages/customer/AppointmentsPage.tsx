import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { Navbar } from "@/components/layout/Navbar";

export function AppointmentsPage(): JSX.Element {
  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="card p-6 mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Appointments</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">My Appointments 📅</h1>
          <p className="mt-2 text-sm text-muted">
            Grooming, vet consultations, and more — all in one place.
          </p>
        </section>
        <EmptyState
          icon="📅"
          title="No appointments booked yet"
          description="Appointment scheduling will connect to your backend here. Book consultations or grooming sessions for your pets."
        />
      </main>
    </PageTransition>
  );
}
