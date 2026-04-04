import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { getCategoryLabel, getCategoryPath, productCategories } from "@/data/catalog";
import { CloseIcon } from "@/components/common/Icons";
import { useAuth } from "@/contexts/AuthContext";

const quickLinks = [
  { to: "/customer/home", label: "Home" },
  { to: "/customer/support", label: "Support" },
];

export function CustomerSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close category sidebar"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-[#13283a]/28 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: -360, opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0.7 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 left-0 z-40 flex w-[min(90vw,360px)] flex-col border-r border-white/60 bg-[#f8f3eb]/96 px-5 pb-6 pt-5 shadow-[0_28px_80px_rgba(19,40,58,0.24)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#eadfce] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Browse</p>
                <h2 className="mt-2 font-heading text-3xl font-semibold text-ink">Categories</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#e6d8c3] bg-white text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5 space-y-3 overflow-y-auto pr-1">
              <div className="rounded-[24px] border border-[#e7d8c1] bg-white/78 p-3 shadow-soft">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Quick Links
                </p>
                <div className="mt-2 space-y-2">
                  {quickLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `block rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "bg-[#2f4f6f] text-white shadow-[0_14px_26px_rgba(47,79,111,0.18)]"
                            : "bg-[#f8f3eb] text-ink hover:bg-white"
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              {productCategories.map((category) => (
                <NavLink
                  key={category}
                  to={getCategoryPath(category)}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block cursor-pointer rounded-[24px] border px-5 py-4 transition ${
                      isActive
                        ? "border-brand-300 bg-white shadow-soft"
                        : "border-transparent bg-white/70 hover:border-[#e7d8c1] hover:bg-white hover:shadow-soft"
                    }`
                  }
                >
                  <p className="text-sm font-semibold text-ink">{getCategoryLabel(category)}</p>
                </NavLink>
              ))}
            </div>

            <div className="mt-auto rounded-[24px] border border-[#e7d8c1] bg-white/80 p-4 shadow-soft">
              <div>
                <p className="text-sm font-semibold text-ink">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                  navigate("/login");
                }}
                className="mt-4 w-full rounded-2xl bg-[#2F4F6F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#243A52]"
              >
                Logout
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
