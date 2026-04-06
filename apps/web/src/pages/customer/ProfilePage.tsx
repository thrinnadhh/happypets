import { useAuth } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const mockPets = [
  { id: "1", name: "Buster", emoji: "🐕", breed: "Labrador" },
  { id: "2", name: "Luna",   emoji: "🐱", breed: "Persian" },
  { id: "3", name: "Milo",   emoji: "🐕", breed: "Beagle" },
];

const menuItems = [
  { icon: "📦", label: "Order History",     to: "/orders" },
  { icon: "❤️", label: "My Favourites",     to: "/favorites" },
  { icon: "💳", label: "Payment Methods",   to: null },
  { icon: "🏠", label: "My Addresses",      to: null },
  { icon: "📅", label: "Appointments",      to: "/customer/appointments" },
  { icon: "🎟️", label: "My Coupons",       to: null },
  { icon: "💬", label: "Support",           to: "/customer/support" },
  { icon: "📞", label: "Contact Us",        to: "/customer/contact" },
];

export function ProfilePage(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 overflow-hidden rounded-2xl"
          style={{ background: "linear-gradient(135deg, #0df2f2 0%, #00a8a8 60%, #005060 100%)" }}
        >
          <div className="flex items-center gap-4 px-6 py-7">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/25 text-2xl font-extrabold text-white backdrop-blur-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xl font-extrabold text-white">{user?.name ?? "My Profile"}</p>
              <p className="truncate text-sm text-white/75">{user?.email}</p>
              <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-white capitalize">
                {user?.role ?? "customer"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* My Pack */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink">My Pack 🐾</h2>
            <button className="text-xs font-semibold text-brand-600 hover:underline">+ Add Pet</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {mockPets.map((pet) => (
              <motion.div
                key={pet.id}
                whileHover={{ y: -4, scale: 1.02 }}
                className="card flex flex-col items-center gap-2 py-4 cursor-pointer hover:shadow-glow"
              >
                <span className="text-4xl">{pet.emoji}</span>
                <p className="text-sm font-bold text-ink">{pet.name}</p>
                <p className="text-[11px] text-muted">{pet.breed}</p>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  View Profile
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Menu */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="card divide-y divide-gray-100 overflow-hidden mb-4"
        >
          {menuItems.map(({ icon, label, to }) =>
            to ? (
              <Link
                key={label}
                to={to}
                className="flex items-center justify-between px-5 py-3.5 transition hover:bg-brand-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold text-ink">{label}</span>
                </div>
                <span className="text-brand-500">›</span>
              </Link>
            ) : (
              <button
                key={label}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-brand-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold text-ink">{label}</span>
                </div>
                <span className="text-brand-500">›</span>
              </button>
            ),
          )}
        </motion.div>

        {/* Sign out */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
        >
          Sign Out
        </motion.button>
      </main>
    </PageTransition>
  );
}
