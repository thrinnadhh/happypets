import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { getCategoryLabel, getCategoryPath, productCategories } from "@/data/catalog";
import { CloseIcon } from "@/components/common/Icons";
import { useAuth } from "@/contexts/AuthContext";

const quickLinks = [
  { to: "/customer/home", label: "🏠 Home" },
  { to: "/orders", label: "📦 Orders" },
  { to: "/favorites", label: "❤️ Favorites" },
  { to: "/profile", label: "👤 Profile" },
  { to: "/customer/support", label: "💬 Support" },
];

const categoryEmojis: Record<string, string> = {
  Dog: "🐕", Cat: "🐱", Fish: "🐠", Hamster: "🐹", Rabbit: "🐰", Birds: "🦜",
};

export function CustomerSidebar({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: -340, opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0.8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 left-0 z-40 flex w-[min(90vw,320px)] flex-col border-r border-brand-100 bg-white shadow-card"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold text-ink"
                  style={{ background: "linear-gradient(135deg, #0df2f2, #00a8a8)" }}
                >
                  🐾
                </div>
                <div>
                  <p className="text-sm font-extrabold text-ink leading-none">HappyPets</p>
                  <p className="text-[10px] uppercase tracking-widest text-brand-600">Menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-muted transition hover:bg-brand-50 hover:text-brand-700"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {/* Quick Links */}
              <div>
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                  Navigation
                </p>
                <div className="space-y-1">
                  {quickLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? "bg-brand-gradient text-ink shadow-glow-sm"
                            : "text-ink hover:bg-brand-50"
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                  Shop by Pet
                </p>
                <div className="space-y-1">
                  {productCategories.map((category) => (
                    <NavLink
                      key={category}
                      to={getCategoryPath(category)}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? "bg-brand-gradient text-ink shadow-glow-sm"
                            : "text-ink hover:bg-brand-50"
                        }`
                      }
                    >
                      <span className="text-base">{categoryEmojis[category] ?? "🐾"}</span>
                      {getCategoryLabel(category)}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-ink"
                  style={{ background: "linear-gradient(135deg, #0df2f2, #00a8a8)" }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-[11px] text-muted">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { logout(); onClose(); navigate("/login"); }}
                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                Sign out
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
