import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TenantProvider, useTenant } from "@/hooks/useTenant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Store } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapAdminSelf } from "@/lib/tenant.functions";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <TenantProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopHeader />
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TenantProvider>
  );
}

function TopHeader() {
  const { tenant, selectedLojaId, setSelectedLojaId } = useTenant();
  const qc = useQueryClient();
  const bootstrap = useServerFn(bootstrapAdminSelf);

  // First-run: if no admin exists, promote the very first signed-in user.
  useEffect(() => {
    if (!tenant || tenant.isAdmin) return;
    bootstrap().then((r) => {
      if (r.promoted) qc.invalidateQueries({ queryKey: ["tenant-context"] });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.userId]);

  const lojaLabel = tenant?.isAdmin
    ? (selectedLojaId ? tenant.lojas.find((l) => l.id === selectedLojaId)?.nome ?? "—" : "Todas as lojas")
    : tenant?.lojaAtual?.nome ?? "—";

  return (
    <header className="h-16 flex items-center gap-3 border-b bg-card/50 backdrop-blur px-4 sticky top-0 z-10">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold">SMART SI</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Store className="h-3 w-3" /> {lojaLabel}
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {tenant?.isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Admin · Loja</span>
            <Select
              value={selectedLojaId ?? "__ALL__"}
              onValueChange={(v) => setSelectedLojaId(v === "__ALL__" ? null : v)}
            >
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todas as lojas</SelectItem>
                {tenant.lojas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </header>
  );
}
