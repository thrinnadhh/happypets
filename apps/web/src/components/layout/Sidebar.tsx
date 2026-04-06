import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function Sidebar({
  title,
  subtitle,
  links,
}: {
  title: string;
  subtitle: string;
  links: Array<{ to: string; label: string }>;
}): JSX.Element {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full flex-col gap-6 rounded-2xl p-5 shadow-card"
      style={{ background: "linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #003535 100%)" }}
    >
      <div className="space-y-2">
        <div className="inline-flex rounded-full bg-brand-400/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-brand-300">
          {subtitle}
        </div>
        <h1 className="text-xl font-extrabold text-white leading-tight">{title}</h1>
        <p className="text-xs font-medium text-white/60">{user?.name}</p>
      </div>

      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-brand-gradient text-ink shadow-glow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Status</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            user?.role === "admin" && !user.approved
              ? "bg-amber-500/20 text-amber-300"
              : "bg-brand-400/20 text-brand-300"
          }`}>
            {user?.role === "admin" && !user.approved ? "Pending" : "Active"}
          </span>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500/20 hover:text-red-300"
        >
          Sign Out
        </button>
      </div>
    </motion.aside>
  );
}
