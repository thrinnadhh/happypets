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
  { to: "/profile", label: "Profile" },
  { to: "/customer/support", label: "Support" },
];

export function Navbar(): JSX.Element {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = (): void => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 12);

      if (currentScrollY < 24 || currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={`sticky top-0 z-20 border-b transition-all duration-300 ${
          scrolled
            ? "border-brand-100 bg-white/95 shadow-soft backdrop-blur-xl"
            : "border-transparent bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 md:px-6">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-muted transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 md:hidden"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>

            <button
              type="button"
              onClick={() => navigate("/customer/home")}
              className="flex cursor-pointer items-center gap-2.5"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-extrabold text-ink shadow-glow-sm"
                style={{ background: "linear-gradient(135deg, #0df2f2 0%, #00a8a8 100%)" }}
              >
                🐾
              </div>
              <div className="text-left">
                <p className="text-base font-extrabold leading-none text-ink">HappyPets</p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-brand-600">
                  Pet Marketplace
                </p>
              </div>
            </button>
          </div>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden items-center gap-1 rounded-xl border border-gray-100 bg-gray-50/80 p-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-brand-gradient text-ink shadow-glow-sm"
                      : "text-muted hover:bg-white hover:text-ink"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Icons + User */}
          <div className="flex items-center gap-2">
            <FavoritesBtn count={favorites.length} />
            <CartBtn count={itemCount} />
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `hidden items-center gap-2 rounded-lg px-3 py-1.5 transition-all md:flex ${
                  isActive ? "bg-brand-50" : "hover:bg-brand-50"
                }`
              }
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-ink"
                style={{ background: "linear-gradient(135deg, #0df2f2, #00a8a8)" }}
              >
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div className="hidden text-left xl:block">
                <p className="text-sm font-semibold text-ink leading-none">{user?.name}</p>
                <p className="text-[11px] text-muted">{user?.email}</p>
              </div>
            </NavLink>
          </div>
        </div>
      </motion.header>

      <CustomerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

function FavoritesBtn({ count }: { count: number }): JSX.Element {
  return (
    <NavLink
      to="/favorites"
      className={({ isActive }) =>
        `relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          isActive
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-gray-200 bg-white text-muted hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        }`
      }
      aria-label="Favorites"
    >
      <HeartIcon />
      {count > 0 && (
        <span className="badge absolute -right-1.5 -top-1.5">{count}</span>
      )}
    </NavLink>
  );
}

function CartBtn({ count }: { count: number }): JSX.Element {
  return (
    <NavLink
      to="/cart"
      className={({ isActive }) =>
        `relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          isActive
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-gray-200 bg-white text-muted hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        }`
      }
      aria-label="Cart"
    >
      <CartIcon />
      {count > 0 && (
        <span className="badge absolute -right-1.5 -top-1.5">{count}</span>
      )}
    </NavLink>
  );
}
