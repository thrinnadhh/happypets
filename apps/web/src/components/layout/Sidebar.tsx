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
      className="flex h-full flex-col gap-6 rounded-[30px] p-6 text-white shadow-card"
      style={{ background: "linear-gradient(180deg, #2F4F6F 0%, #243A52 100%)" }}
    >
      <div className="space-y-2">
        <div className="inline-flex rounded-full bg-[#f4e5be] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#85631b]">
          {subtitle}
        </div>
        <h1 className="font-heading text-3xl font-semibold">{title}</h1>
        <p className="text-sm leading-7 text-slate-300">
          Signed in as {user?.name}. Role-based permissions are enforced on every route.
        </p>
      </div>

      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${
                isActive
                  ? "bg-white text-ink shadow-[0_16px_30px_rgba(15,23,42,0.18)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
        <p className="text-sm font-medium">Session status</p>
        <p className="mt-2 text-sm text-slate-300">
          {user?.role === "admin" && !user.approved
            ? "Pending Approval"
            : "Active session"}
        </p>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-4 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Logout
        </button>
      </div>
    </motion.aside>
  );
}
