import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenantContext, type TenantContext } from "@/lib/tenant.functions";

const Ctx = createContext<{
  tenant: TenantContext | null;
  isLoading: boolean;
  selectedLojaId: string | null;
  setSelectedLojaId: (id: string | null) => void;
} | null>(null);

const STORAGE_KEY = "smartsi.selectedLojaId";

export function TenantProvider({ children }: { children: ReactNode }) {
  const fetchCtx = useServerFn(getTenantContext);
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-context"],
    queryFn: () => fetchCtx(),
    staleTime: 60_000,
  });

  const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  const selected = stored === "__ALL__" ? null : stored;

  const setSelectedLojaId = (id: string | null) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, id ?? "__ALL__");
    // full reload so all queries refetch scoped
    window.location.reload();
  };

  // For non-admins, always use their own loja
  const effective = data?.isAdmin ? selected : data?.lojaId ?? null;

  return (
    <Ctx.Provider value={{ tenant: data ?? null, isLoading, selectedLojaId: effective, setSelectedLojaId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTenant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTenant must be used within TenantProvider");
  return v;
}
