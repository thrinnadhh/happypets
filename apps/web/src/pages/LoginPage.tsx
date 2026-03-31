import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/common/PageTransition";
import { getDefaultRoute, useAuth } from "@/contexts/AuthContext";

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("customer@happypets.com");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const user = await login({ email, password });
      const redirectTo = (location.state as { from?: Location })?.from?.pathname;
      navigate(redirectTo ?? getDefaultRoute(user), { replace: true });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 md:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.section
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-8 md:p-10"
          >
            <span className="tag">Role-based access</span>
            <h1 className="mt-5 font-heading text-5xl font-semibold tracking-[-0.04em] text-ink">
              Premium pet operations for customers, admins, and super admins.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Sign in once and we route you to the correct workspace automatically. Customer routes are isolated,
              admin tools are protected, and super admin gets full platform access.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Customer", "customer@happypets.com"],
                ["Approved Admin", "admin@happypets.com"],
                ["Pending Admin", "pending.admin@happypets.com"],
              ].map(([label, demoEmail]) => (
                <motion.button
                  key={demoEmail}
                  whileHover={{ y: -5 }}
                  onClick={() => setEmail(demoEmail)}
                  className="stat-panel text-left"
                >
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="mt-2 text-sm text-slate-500">{demoEmail}</p>
                </motion.button>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-8 md:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Single Login</p>
            <h2 className="mt-3 font-heading text-4xl font-semibold text-ink">Access your workspace</h2>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="field">
                <span>Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input"
                  type="email"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input"
                  type="password"
                  required
                />
              </label>

              {error ? <p className="text-sm text-rose-500">{error}</p> : null}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                className="primary-button w-full justify-center"
              >
                {submitting ? "Signing in..." : "Login"}
              </motion.button>
            </form>

            <div className="mt-6 rounded-[24px] bg-[#faf5ea] p-5 text-sm leading-7 text-slate-600">
              Use any email containing <strong>admin</strong> for admin, <strong>pending</strong> for a pending admin,
              and <strong>super</strong> for super admin. Everything else becomes a customer account.
            </div>
          </motion.section>
        </div>
      </div>
    </PageTransition>
  );
}
