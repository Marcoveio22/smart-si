import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingBadge } from "@/components/RatingBadge";
import { StatusManualBadge } from "@/components/StatusManualBadge";
import { Users, ShieldCheck, Gem, Crown, Award, AlertOctagon, BellRing, DollarSign, Flag, Circle, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

const RATING_COLORS: Record<string, string> = {
  DIAMOND: "var(--rating-diamond)",
  GOLD: "var(--rating-gold)",
  SILVER: "var(--rating-silver)",
  RED: "var(--rating-red)",
  TRUSTED: "var(--rating-trusted)",
};

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: accent ? `color-mix(in oklab, ${accent} 18%, transparent)` : "var(--muted)", color: accent ?? "var(--primary)" }}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const { selectedLojaId, tenant } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", selectedLojaId ?? "own"],
    queryFn: () => fetchStats({ data: { lojaId: selectedLojaId } }),
    enabled: !!tenant,
  });

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Carregando dados do banco...</div>;
  }

  const { totalClientes, byRating, byStatusManual, alertasAtivos, faturamentoTotal, fatPorMes, alertasPorDia, top10 } = data;
  const pieData = ["DIAMOND", "GOLD", "SILVER", "RED", "TRUSTED"].map((r) => ({ name: r, value: byRating[r] ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da operação — dados em tempo real do banco</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard icon={Users} label="Total de Clientes" value={totalClientes.toLocaleString("pt-BR")} />
        <StatCard icon={ShieldCheck} label="Status: TRUSTED" value={byStatusManual.TRUSTED ?? 0} accent="var(--rating-trusted)" />
        <StatCard icon={Circle} label="Status: NEUTRO" value={byStatusManual.NEUTRO ?? 0} />
        <StatCard icon={Flag} label="Status: RED FLAG" value={byStatusManual.RED_FLAG ?? 0} accent="var(--rating-red)" />
        <StatCard icon={Gem} label="DIAMOND" value={byRating.DIAMOND ?? 0} accent="var(--rating-diamond)" />
        <StatCard icon={Crown} label="GOLD" value={byRating.GOLD ?? 0} accent="var(--rating-gold)" />
        <StatCard icon={Award} label="SILVER" value={byRating.SILVER ?? 0} accent="var(--rating-silver)" />
        <StatCard icon={AlertOctagon} label="RED" value={byRating.RED ?? 0} accent="var(--rating-red)" />
        <StatCard icon={BellRing} label="Alertas Ativos" value={alertasAtivos} accent="var(--destructive)" />
        <StatCard icon={DollarSign} label="Faturamento Total" value={faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} accent="var(--rating-trusted)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição de Ratings</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d) => <Cell key={d.name} fill={RATING_COLORS[d.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução de Faturamento</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={fatPorMes}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: any) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Alertas por Período</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={alertasPorDia}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Clientes por Classificação</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pieData.map((d) => <Cell key={d.name} fill={RATING_COLORS[d.name]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 Clientes por Compras</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr><th className="py-2">#</th><th>Cartão</th><th>Rating</th><th>Status Manual</th><th className="text-right">Compras</th><th className="text-right">Gasto</th></tr>
              </thead>
              <tbody>
                {top10.map((c: any, i: number) => (
                  <tr key={c.numero_cartao} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="font-mono">{c.numero_cartao}</td>
                    <td><RatingBadge rating={c.rating_final} /></td>
                    <td><StatusManualBadge status={c.status_manual} /></td>
                    <td className="text-right">{c.total_compras}</td>
                    <td className="text-right font-semibold">{Number(c.total_gasto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                ))}
                {!top10.length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Sem dados</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
