import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { CartIcon, HeartIcon, MenuIcon } from "@/components/common/Icons";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";

const links = [
  { to: "/customer/home", label: "Home" },
  { to: "/cart", label: "Cart" },
  { to: "/orders", label: "Orders" },
  { to: "/favorites", label: "Favorites" },
  { to: "/customer/support", label: "Support" },
];

export function Navbar(): JSX.Element {
  const { logout, user } = useAuth();
  const { favorites } = useFavorites();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 border-b border-white/50 bg-[#f8f1e6]/88 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[#e6d8c3] bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700"
              >
                <MenuIcon />
                <span className="hidden sm:inline">Browse</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/customer/home")}
                className="flex cursor-pointer items-center gap-3"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-soft"
                  style={{ backgroundImage: "linear-gradient(135deg, #2F4F6F 0%, #3B628A 100%)" }}
                >
                  H
                </div>
                <div className="text-left">
                  <p className="font-heading text-lg font-semibold text-ink">HappyPets</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pet marketplace</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3 xl:hidden">
              <FavoritesButton count={favorites.length} />
              <CartButton count={itemCount} />
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
            <nav className="flex flex-wrap items-center gap-2 rounded-full bg-white/78 p-1 shadow-soft">
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
              <div className="hidden items-center gap-3 xl:flex">
                <FavoritesButton count={favorites.length} />
                <CartButton count={itemCount} />
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
        </div>
      </motion.header>

      <CustomerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

function FavoritesButton({ count }: { count: number }): JSX.Element {
  return (
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
      {count ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </NavLink>
  );
}

function CartButton({ count }: { count: number }): JSX.Element {
  return (
    <NavLink
      to="/cart"
      className={({ isActive }) =>
        `relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
          isActive
            ? "border-brand-300 bg-brand-100 text-brand-700"
            : "border-[#e8dfd1] bg-white/90 text-slate-500 hover:border-brand-300 hover:text-brand-700"
        }`
      }
      aria-label="Cart"
    >
      <CartIcon />
      {count ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-[#2F4F6F] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </NavLink>
  );
}
