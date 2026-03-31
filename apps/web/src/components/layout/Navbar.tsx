import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { CartIcon, HeartIcon } from "@/components/common/Icons";

const links = [
  { to: "/customer/home", label: "Home" },
  { to: "/customer/appointments", label: "Appointments" },
  { to: "/customer/contact", label: "Contact" },
  { to: "/customer/support", label: "Support" },
];

export function Navbar(): JSX.Element {
  const { logout, user } = useAuth();
  const { favorites } = useFavorites();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 border-b border-white/40 bg-[#f8f1e6]/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-soft"
            style={{ backgroundImage: "linear-gradient(135deg, #2F4F6F 0%, #3B628A 100%)" }}
          >
            H
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-ink">HappyPets</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Customer Workspace</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 rounded-full bg-white/70 p-1 shadow-soft">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#2f4f6f] text-white shadow-[0_14px_26px_rgba(47,79,111,0.18)]"
                    : "text-slate-600 hover:bg-[#f7f0e3] hover:text-ink"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <NavLink
            to="/favorites"
            className={({ isActive }) =>
              `relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                isActive
                  ? "border-brand-300 bg-brand-100 text-brand-700"
                  : "border-[#e8dfd1] bg-white/90 text-slate-500 hover:border-brand-300 hover:text-brand-700"
              }`
            }
            aria-label="Favorites"
          >
            <HeartIcon />
            {favorites.length ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {favorites.length}
              </span>
            ) : null}
          </NavLink>
          <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e8dfd1] bg-white/90 text-slate-500">
            <CartIcon />
            {itemCount ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-[#2F4F6F] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            ) : null}
          </div>
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-ink">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="soft-button"
          >
            Logout
          </button>
        </div>
      </div>
    </motion.header>
  );
}
