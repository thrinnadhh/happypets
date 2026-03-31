import { EmptyState } from "@/components/common/EmptyState";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";

export function AppointmentsPage(): JSX.Element {
  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <EmptyState
          title="No appointments booked yet"
          description="Appointment scheduling can plug into your real backend later. For now, this protected customer route is ready for consultation or grooming flows."
        />
      </main>
    </PageTransition>
  );
}
