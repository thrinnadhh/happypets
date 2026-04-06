import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/common/PageTransition";
import { getDefaultRoute, useAuth } from "@/contexts/AuthContext";
import { SignupRole } from "@/types";

const roles = [
  {
    value: "customer",
    label: "Customer",
    emoji: "🛍️",
    desc: "Browse & shop for your pets",
  },
  {
    value: "admin",
    label: "Admin",
    emoji: "🏪",
    desc: "Manage your pet shop products",
  },
];

export function LoginPage(): JSX.Element {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [role, setRole] = useState<SignupRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        const user = await login({ email, password });
        const redirectTo = (location.state as { from?: Location })?.from?.pathname;
        navigate(redirectTo ?? getDefaultRoute(user), { replace: true });
      } else {
        const result = await register({ name, email, password, role });
        if (result.user) {
          navigate(getDefaultRoute(result.user), { replace: true });
        } else {
          setNotice(result.message ?? "Account created. Verify your email and then sign in.");
          setMode("login");
        }
      }
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : mode === "login"
            ? "Unable to sign in."
            : "Unable to create your account.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-page">
      <div className="flex min-h-screen">
        {/* Left panel */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden w-1/2 flex-col justify-between overflow-hidden lg:flex"
          style={{ background: "linear-gradient(160deg, #0df2f2 0%, #00a8a8 50%, #005f60 100%)" }}
        >
          <div className="px-12 pt-14">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur-sm">
                🐾
              </div>
              <div>
                <p className="text-xl font-extrabold text-white">HappyPets</p>
                <p className="text-xs font-medium uppercase tracking-widest text-white/70">
                  Pet Marketplace
                </p>
              </div>
            </div>

            <h1 className="mt-16 text-5xl font-extrabold leading-tight text-white">
              Everything your<br />
              <span className="text-white/80">furry friend</span><br />
              needs. 🐕
            </h1>
            <p className="mt-6 max-w-sm text-lg text-white/80">
              Shop premium pet food, toys, and accessories from trusted local stores.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 px-10 pb-12">
            {[
              { emoji: "🐕", label: "Dogs" },
              { emoji: "🐱", label: "Cats" },
              { emoji: "🐠", label: "Fish" },
              { emoji: "🐹", label: "Hamsters" },
              { emoji: "🐰", label: "Rabbits" },
              { emoji: "🦜", label: "Birds" },
            ].map(({ emoji, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-xl bg-white/15 py-4 text-center backdrop-blur-sm"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs font-semibold text-white">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right panel — auth form */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-1 flex-col items-center justify-center px-6 py-12"
        >
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-extrabold text-ink"
                style={{ background: "linear-gradient(135deg, #0df2f2, #00a8a8)" }}
              >
                🐾
              </div>
              <p className="text-lg font-extrabold text-ink">HappyPets</p>
            </div>

            {/* Tab switcher */}
            <div className="mb-8 flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setMode(tab); setError(""); setNotice(""); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                    mode === tab
                      ? "bg-brand-gradient text-ink shadow-glow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {tab === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <h2 className="mb-2 text-2xl font-extrabold text-ink">
              {mode === "login" ? "Welcome back! 👋" : "Create your account"}
            </h2>
            <p className="mb-6 text-sm text-muted">
              {mode === "login"
                ? "Sign in to access your HappyPets workspace."
                : "Join HappyPets and start shopping for your pets."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <label className="field">
                    <span>Full Name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      placeholder="Your name"
                      required
                    />
                  </label>

                  <div className="field">
                    <span>Account Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value as SignupRole)}
                          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                            role === r.value
                              ? "border-brand-400 bg-brand-50 shadow-glow-sm"
                              : "border-gray-200 bg-white hover:border-brand-200"
                          }`}
                        >
                          <span className="text-xl">{r.emoji}</span>
                          <p className="mt-1 text-sm font-semibold text-ink">{r.label}</p>
                          <p className="text-[11px] text-muted">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <label className="field">
                <span>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </label>

              {notice && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60"
              >
                {submitting
                  ? mode === "login" ? "Signing in…" : "Creating account…"
                  : mode === "login" ? "Sign In" : "Create Account"}
              </motion.button>
            </form>

            {mode === "signup" && (
              <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
                Admin accounts are created as pending requests. A superadmin must approve them before access is granted.
              </p>
            )}

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: "🛡️", label: "Role-based access" },
                { icon: "⚡", label: "Instant checkout" },
                { icon: "🐾", label: "All pet types" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <span className="text-xl">{icon}</span>
                  <p className="text-[11px] font-semibold text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
