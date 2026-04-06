import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchCurrentUserFromSupabase,
  signInWithSupabase,
  signOutFromSupabase,
  signUpWithSupabase,
  supabase,
} from "@/lib/supabase";
import { LoginPayload, Role, SignupPayload, SignupResult, User } from "@/types";

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: SignupPayload) => Promise<SignupResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    const syncUser = async (): Promise<void> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session) {
          setUser(null);
          setToken(null);
          return;
        }

        const nextUser = await fetchCurrentUserFromSupabase();
        if (!active) return;

        setUser(nextUser);
        setToken(session.access_token);
      } catch {
        if (!active) return;
        setUser(null);
        setToken(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      void (async () => {
        try {
          const nextUser = await fetchCurrentUserFromSupabase();
          if (!active) return;
          setUser(nextUser);
          setToken(session.access_token);
        } catch {
          if (!active) return;
          setUser(null);
          setToken(null);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    const response = await signInWithSupabase(payload);
    setUser(response.user);
    setToken(response.session.access_token);
    return response.user;
  };

  const register = async (payload: SignupPayload): Promise<SignupResult> => {
    const response = await signUpWithSupabase(payload);
    if (response.user) {
      const {
        data: { session },
      } = await supabase!.auth.getSession();
      setUser(response.user);
      setToken(session?.access_token ?? null);
    }
    return response;
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    void signOutFromSupabase();
  };

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      loading,
      login,
      register,
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
