import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest } from "@/api/mockApi";
import { LoginPayload, Role, User } from "@/types";

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "happypets-auth";

export function getDefaultRoute(user: User | null): string {
  if (!user) return "/login";
  if (user.role === "superadmin") return "/superadmin/dashboard";
  if (user.role === "admin") return "/admin/dashboard";
  return "/customer/home";
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as { user: User; token: string };
      setUser(parsed.user);
      setToken(parsed.token);
    }

    setLoading(false);
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    const response = await loginRequest(payload);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    return response.user;
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      loading,
      login,
      logout,
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
