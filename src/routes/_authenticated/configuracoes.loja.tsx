import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLojaStats } from "@/lib/tenant.functions";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, Receipt, Bell, Cpu, Loader2, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes/loja")({ component: LojaPage });

function LojaPage() {
  const fetchStats = useServerFn(getLojaStats);
  const { selectedLojaId, tenant } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["loja-stats", selectedLojaId ?? "own"],
    queryFn: () => fetchStats({ data: { lojaId: selectedLojaId } }),
    enabled: !!tenant,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Carregando dados da loja...</div>;
  if (!data) return <div className="text-muted-foreground">Nenhuma loja selecionada.</div>;

  const { loja, clientes, transacoes, alertas, processamentos, ultimoProcessamento } = data;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações · Loja</h1>
        <p className="text-sm text-muted-foreground">Informações e indicadores da loja selecionada</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Building2 className="h-5 w-5" /></div>
          <div>
            <CardTitle className="text-lg">{loja?.nome ?? "—"}</CardTitle>
            <div className="text-xs text-muted-foreground">{loja?.razao_social ?? "Sem razão social"}</div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <Field label="Nome" value={loja?.nome} />
          <Field label="Razão Social" value={loja?.razao_social} />
          <Field label="CNPJ" value={loja?.cnpj} />
          <Field label="Status" value={loja?.ativo ? "Ativa" : "Inativa"} />
          <Field label="ID" value={loja?.id} mono />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Clientes" value={clientes} />
        <StatCard icon={Receipt} label="Transações" value={transacoes} />
        <StatCard icon={Bell} label="Alertas Ativos" value={alertas} />
        <StatCard icon={Cpu} label="Processamentos" value={processamentos} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Store className="h-5 w-5" /></div>
          <CardTitle className="text-base">Último Processamento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {ultimoProcessamento ? (
            <div className="flex items-center justify-between">
              <div>{new Date(ultimoProcessamento.created_at).toLocaleString("pt-BR")}</div>
              <div className="text-xs uppercase font-semibold text-muted-foreground">{ultimoProcessamento.status}</div>
            </div>
          ) : <div className="text-muted-foreground">Nenhum processamento registrado ainda.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs mt-1" : "mt-1 font-medium"}>{value ?? "—"}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value.toLocaleString("pt-BR")}</div>
        </div>
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}
