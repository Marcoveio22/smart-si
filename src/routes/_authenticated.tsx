import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TenantProvider, useTenant } from "@/hooks/useTenant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Store, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapAdminSelf } from "@/lib/tenant.functions";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { next: undefined } });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <TenantProvider>
      <TenantGate />
    </TenantProvider>
  );
}

// Runs the first-run admin bootstrap BEFORE deciding whether to show the
// "aguardando liberação" screen — since a new signup now has zero lojas by
// default (C2), if bootstrap only ran inside the normal layout, the very
// first user could get stuck behind the gate and never become admin.
function TenantGate() {
  const { tenant, isLoading } = useTenant();
  const qc = useQueryClient();
  const bootstrap = useServerFn(bootstrapAdminSelf);

  useEffect(() => {
    if (!tenant || tenant.isAdmin) return;
    bootstrap().then((r) => {
      if (r.promoted) qc.invalidateQueries({ queryKey: ["tenant-context"] });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.userId]);

  if (isLoading) return null;

  if (tenant && !tenant.isAdmin && tenant.lojas.length === 0) {
    return <AguardandoLiberacao email={tenant.email} />;
  }

  return (
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
  );
}

function AguardandoLiberacao({ email }: { email: string | null }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold">Aguardando liberação</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta{email ? ` (${email})` : ""} foi criada com sucesso, mas ainda não está
          vinculada a nenhuma loja. Um administrador precisa liberar seu acesso antes que você
          possa usar o Smart SI.
        </p>
        <p className="text-xs text-muted-foreground">
          Assim que a liberação for feita, atualize esta página para continuar.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button onClick={() => window.location.reload()}>
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sair
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TopHeader() {
  const { tenant, selectedLojaId, setSelectedLojaId } = useTenant();
  const isAdmin = !!tenant?.isAdmin;
  const showSelector = isAdmin || (tenant?.lojas.length ?? 0) > 1;
  const currentLoja = tenant?.lojas.find((l) => l.id === selectedLojaId) ?? null;
  const lojaLabel = isAdmin
    ? (selectedLojaId ? currentLoja?.nome ?? "—" : "Todas as lojas")
    : currentLoja?.nome ?? tenant?.lojaAtual?.nome ?? "—";

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
        {showSelector && tenant && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {isAdmin ? "Admin · Loja" : "Loja"}
            </span>
            <Select
              value={selectedLojaId ?? (isAdmin ? "__ALL__" : "")}
              onValueChange={(v) => setSelectedLojaId(v === "__ALL__" ? null : v)}
            >
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="__ALL__">Todas as lojas</SelectItem>}
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
