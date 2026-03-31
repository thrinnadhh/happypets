import { createContext, useContext, useMemo, useState } from "react";
import { defaultAdmins } from "@/data/mockData";
import { AdminRecord } from "@/types";

type PlatformContextValue = {
  admins: AdminRecord[];
  approveAdmin: (id: string) => void;
  revokeAdmin: (id: string) => void;
};

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export function PlatformProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [admins, setAdmins] = useState<AdminRecord[]>(defaultAdmins);

  const approveAdmin = (id: string): void => {
    setAdmins((current) =>
      current.map((admin) => (admin.id === id ? { ...admin, status: "Approved" } : admin)),
    );
  };

  const revokeAdmin = (id: string): void => {
    setAdmins((current) =>
      current.map((admin) => (admin.id === id ? { ...admin, status: "Pending" } : admin)),
    );
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
