import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  approveAdminInSupabase,
  fetchAdminsFromSupabase,
  rejectAdminInSupabase,
  revokeAdminInSupabase,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AdminRecord } from "@/types";

type PlatformContextValue = {
  admins: AdminRecord[];
  approveAdmin: (id: string) => void;
  revokeAdmin: (id: string) => void;
};

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export function PlatformProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { role, user } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);

  const refreshAdmins = async (): Promise<void> => {
    if (role !== "superadmin" || !user) {
      setAdmins([]);
      return;
    }

    try {
      setAdmins(await fetchAdminsFromSupabase());
    } catch {
      setAdmins([]);
    }
  };

  useEffect(() => {
    void refreshAdmins();
  }, [role, user?.id]);

  const approveAdmin = (id: string): void => {
    setAdmins((current) =>
      current.map((admin) => (admin.id === id ? { ...admin, status: "Approved" } : admin)),
    );

    void approveAdminInSupabase(id).then(refreshAdmins).catch(refreshAdmins);
  };

  const revokeAdmin = (id: string): void => {
    const currentStatus = admins.find((admin) => admin.id === id)?.status;
    setAdmins((current) =>
      current.map((admin) =>
        admin.id === id
          ? { ...admin, status: admin.status === "Pending" ? "Rejected" : "Revoked" }
          : admin,
      ),
    );

    void (
      currentStatus === "Pending" ? rejectAdminInSupabase(id) : revokeAdminInSupabase(id)
    )
      .then(refreshAdmins)
      .catch(refreshAdmins);
  };

  const value = useMemo(
    () => ({
      admins,
      approveAdmin,
      revokeAdmin,
    }),
    [admins],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error("usePlatform must be used inside PlatformProvider");
  }

  return context;
}
