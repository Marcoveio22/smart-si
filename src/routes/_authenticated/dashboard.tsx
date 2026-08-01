import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { getFinanceiroResumo, getDashboardProdutos, getDashboardHorarios } from "@/lib/api/dashboard.functions";
import { queryKeys } from "@/lib/api/queryKeys";
import { periodLabel, periodRange, type PeriodKey } from "@/lib/periods";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { FinancialPanel } from "@/components/dashboard/FinancialPanel";
import { ProductRanking } from "@/components/dashboard/ProductRanking";
import { CriticalHoursHeatmap } from "@/components/dashboard/CriticalHoursHeatmap";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { ExecutiveReportDialog } from "@/components/dashboard/ExecutiveReportDialog";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { useMemo, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingBadge } from "@/components/RatingBadge";
import { StatusManualBadge } from "@/components/StatusManualBadge";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { RecurringClientCard, type RecurringClient } from "@/components/dashboard/RecurringClientCard";
import { RecommendationCard, type Recommendation } from "@/components/dashboard/RecommendationCard";
import { RecentOccurrenceCard, type RecentOccurrence } from "@/components/dashboard/RecentOccurrenceCard";
import {
  Users, ShieldCheck, Gem, Crown, Award, AlertOctagon, BellRing, DollarSign, Flag, Circle, Loader2,
  ShoppingCart, Trophy, Percent, Send, Brain,
  TrendingUp, Clock, PackageSearch, CalendarRange, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo — SMART SI Monitoramento" },
      { name: "description", content: "Indicadores operacionais, ocorrências e recuperação de valores dos minimercados autônomos." },
      { property: "og:title", content: "Dashboard Executivo — SMART SI Monitoramento" },
      { property: "og:description", content: "Indicadores operacionais, ocorrências e recuperação de valores em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const RATING_COLORS: Record<string, string> = {
  DIAMOND: "var(--rating-diamond)",
  GOLD: "var(--rating-gold)",
  SILVER: "var(--rating-silver)",
  RED: "var(--rating-red)",
  TRUSTED: "var(--rating-trusted)",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------- Conteúdo estrutural (aguardando lógica nas próximas sprints) ---------- */

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const RECOMENDACOES: Recommendation[] = [
  { id: "1", titulo: "Revisar 3 clientes RED com compras acima da média", detalhe: "Padrão de valor divergente nas últimas 48h", prioridade: "alta", icon: AlertOctagon },
  { id: "2", titulo: "Enviar cobrança pendente de ocorrências abertas", detalhe: "Ocorrências sem tratativa há mais de 5 dias", prioridade: "alta", icon: Send },
  { id: "3", titulo: "Reforçar reposição no horário de pico (18h–21h)", detalhe: "Maior incidência de ocorrências no período", prioridade: "media", icon: Clock },
  { id: "4", titulo: "Promover 4 clientes SILVER para GOLD", detalhe: "Recorrência e ticket médio acima do percentil 75", prioridade: "media", icon: TrendingUp },
  { id: "5", titulo: "Auditar produtos com maior perda", detalhe: "Concentração de perdas em 5 SKUs", prioridade: "baixa", icon: PackageSearch },
];

const OCORRENCIAS_RECENTES: RecentOccurrence[] = [
  { id: "1", descricao: "Diferença de valor na conferência do caixa", status: "Em análise", loja: "Loja Principal", horario: "há 12 min", statusTone: "atencao" },
  { id: "2", descricao: "Produto retirado sem registro de compra", status: "Crítico", loja: "POINT VILA YARA", horario: "há 48 min", statusTone: "critico" },
  { id: "3", descricao: "Cobrança recuperada com sucesso", status: "Resolvido", loja: "My Helbor", horario: "há 2 h", statusTone: "ok" },
  { id: "4", descricao: "Cartão com uso atípico em múltiplos horários", status: "Em análise", loja: "CONDOMINIO BELA VISTA", horario: "há 3 h", statusTone: "atencao" },
];

/* ---------------------------------- Página ---------------------------------- */

function Dashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchFinanceiro = useServerFn(getFinanceiroResumo);
  const fetchProdutos = useServerFn(getDashboardProdutos);
  const fetchHorarios = useServerFn(getDashboardHorarios);
  const { selectedLojaId, tenant, lojas } = useTenant() as any;

  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [produtoPeriod, setProdutoPeriod] = useState<PeriodKey>("30d");
  const [reportOpen, setReportOpen] = useState(false);

  const filters = useMemo(
    () => ({ lojaId: selectedLojaId ?? null, ...periodRange(period), page: 0, pageSize: 50 }),
    [selectedLojaId, period],
  );
  const produtoFilters = useMemo(
    () => ({ lojaId: selectedLojaId ?? null, ...periodRange(produtoPeriod), page: 0, pageSize: 200 }),
    [selectedLojaId, produtoPeriod],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", selectedLojaId ?? "own"],
    queryFn: () => fetchStats({ data: { lojaId: selectedLojaId } }),
    enabled: !!tenant,
  });

  const financeiroQ = useQuery({
    queryKey: queryKeys.dashboard.financeiro(filters),
    queryFn: () => fetchFinanceiro({ data: filters }),
    enabled: !!tenant,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const produtosQ = useQuery({
    queryKey: queryKeys.dashboard.produtos(produtoFilters),
    queryFn: () => fetchProdutos({ data: produtoFilters }),
    enabled: !!tenant,
    staleTime: 60_000,
  });
  const horariosQ = useQuery({
    queryKey: queryKeys.dashboard.horarios(filters),
    queryFn: () => fetchHorarios({ data: filters }),
    enabled: !!tenant,
    staleTime: 60_000,
  });

  const lojaLabel =
    (Array.isArray(lojas) ? lojas.find((l: any) => l.id === selectedLojaId)?.nome : null) ??
    (selectedLojaId ? "Loja selecionada" : "Todas as lojas");

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />Carregando dados do banco...
      </div>
    );
  }

  const { totalClientes, byRating, byStatusManual, alertasAtivos, faturamentoTotal, fatPorMes, alertasPorDia, top10 } = data;
  const pieData = ["DIAMOND", "GOLD", "SILVER", "RED", "TRUSTED"].map((r) => ({ name: r, value: byRating[r] ?? 0 }));

  const fatSeries = fatPorMes.map((m: any) => Number(m.total) || 0);
  const alertaSeries = alertasPorDia.map((a: any) => Number(a.total) || 0);
  const deltaFat =
    fatSeries.length > 1 && fatSeries[fatSeries.length - 2] > 0
      ? ((fatSeries[fatSeries.length - 1] - fatSeries[fatSeries.length - 2]) / fatSeries[fatSeries.length - 2]) * 100
      : null;
  const deltaAlertas =
    alertaSeries.length > 1 && alertaSeries[alertaSeries.length - 2] > 0
      ? ((alertaSeries[alertaSeries.length - 1] - alertaSeries[alertaSeries.length - 2]) / alertaSeries[alertaSeries.length - 2]) * 100
      : null;

  const recorrentes: RecurringClient[] = (top10 as any[]).slice(0, 5).map((c) => ({
    id: c.numero_cartao,
    nome: c.numero_cartao,
    ocorrencias: c.total_compras,
    ultimaOcorrencia: `Rating ${c.rating_final ?? "—"} · ${brl(Number(c.total_gasto) || 0)}`,
    horario: "—",
  }));


  return (
    <div className="space-y-8">
      {/* Topo */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground truncate">
            Visão geral da operação — dados em tempo real do banco
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setReportOpen(true)}>
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">Relatório</span>
          </Button>
        </div>
      </header>

      {/* Linha 1 — indicadores */}
      <section>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            icon={DollarSign} label="Faturamento do Dia" value={brl(faturamentoTotal)}
            delta={deltaFat} series={fatSeries} accent="var(--rating-trusted)" hint="acumulado do período"
          />
          <MetricCard
            icon={ShoppingCart} label="Compras do Dia" value={totalClientes.toLocaleString("pt-BR")}
            delta={null} series={fatSeries} accent="var(--chart-1)" hint="base de clientes ativos"
          />
          <MetricCard
            icon={BellRing} label="Ocorrências do Dia" value={alertasAtivos}
            delta={deltaAlertas} series={alertaSeries} accent="var(--destructive)" hint="alertas ativos"
          />
          <MetricCard
            icon={Trophy} label="Valores Recuperados" value={brl(financeiroQ.data?.valorRecuperado ?? 0)}
            delta={null} accent="var(--rating-gold)" hint={periodLabel(period)}
          />
          <MetricCard
            icon={Percent} label="Taxa de Recuperação"
            value={`${Math.round((financeiroQ.data?.taxaRecuperacao ?? 0) * 100)}%`}
            delta={null} accent="var(--accent)" hint="valor recuperado / perdido"
          />
        </div>
      </section>

      {/* Linha 2 — 3 colunas */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <DashboardCard
          title="Clientes Recorrentes Identificados Hoje"
          icon={Users}
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/clientes">Ver Todos <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          }
        >
          <div className="space-y-1">
            {recorrentes.map((c) => <RecurringClientCard key={c.id} client={c} />)}
            {!recorrentes.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">Sem clientes identificados</div>
            )}
          </div>
        </DashboardCard>

        <FinancialPanel data={financeiroQ.data as any} isLoading={financeiroQ.isLoading} />

        <QuickActionsPanel filters={filters} onOpenReport={() => setReportOpen(true)} />
      </section>

      {/* Linha 3 — ranking de produtos e horários críticos */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <ProductRanking
          data={(produtosQ.data?.ranking ?? []) as any}
          isLoading={produtosQ.isLoading}
          period={produtoPeriod}
          onPeriodChange={setProdutoPeriod}
        />

        <CriticalHoursHeatmap
          data={(horariosQ.data?.celulas ?? []) as any}
          isLoading={horariosQ.isLoading}
          action={
            <ExportMenu
              filename="horarios-criticos"
              title="Horários com maior incidência"
              rows={(horariosQ.data?.celulas ?? []) as any[]}
              cols={[
                { key: "diaSemana", header: "Dia da semana", format: (v: unknown) => DIAS[Number(v)] ?? String(v) },
                { key: "hora", header: "Hora" },
                { key: "total", header: "Ocorrências" },
                { key: "valor", header: "Valor perdido", format: (v: unknown) => brl(Number(v ?? 0)) },
              ]}
            />
          }
        />
      </section>

      {/* Linha 4 — IA */}
      <section>
        <DashboardCard title="IA Recomenda Hoje" icon={Brain}>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
            {RECOMENDACOES.map((r) => <RecommendationCard key={r.id} item={r} />)}
          </div>
        </DashboardCard>
      </section>

      {/* Linha 5 — ocorrências recentes */}
      <section>
        <DashboardCard
          title="Ocorrências Recentes"
          icon={BellRing}
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/ocorrencias">Ver Todas <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {OCORRENCIAS_RECENTES.map((o) => <RecentOccurrenceCard key={o.id} item={o} />)}
          </div>
        </DashboardCard>
      </section>

      {/* Análise detalhada — conteúdo original preservado */}
      <section>
        <SectionHeader title="Análise detalhada" description="Indicadores completos da base de clientes" />

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <MiniStat icon={Users} label="Total de Clientes" value={totalClientes.toLocaleString("pt-BR")} />
          <MiniStat icon={ShieldCheck} label="TRUSTED" value={byStatusManual.TRUSTED ?? 0} accent="var(--rating-trusted)" />
          <MiniStat icon={Circle} label="NEUTRO" value={byStatusManual.NEUTRO ?? 0} />
          <MiniStat icon={Flag} label="RED FLAG" value={byStatusManual.RED_FLAG ?? 0} accent="var(--rating-red)" />
          <MiniStat icon={Gem} label="DIAMOND" value={byRating.DIAMOND ?? 0} accent="var(--rating-diamond)" />
          <MiniStat icon={Crown} label="GOLD" value={byRating.GOLD ?? 0} accent="var(--rating-gold)" />
          <MiniStat icon={Award} label="SILVER" value={byRating.SILVER ?? 0} accent="var(--rating-silver)" />
          <MiniStat icon={AlertOctagon} label="RED" value={byRating.RED ?? 0} accent="var(--rating-red)" />
          <MiniStat icon={BellRing} label="Alertas Ativos" value={alertasAtivos} accent="var(--destructive)" />
          <MiniStat icon={DollarSign} label="Faturamento Total" value={brl(faturamentoTotal)} accent="var(--rating-trusted)" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <DashboardCard title="Distribuição de Ratings" contentClassName="h-[260px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d) => <Cell key={d.name} fill={RATING_COLORS[d.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </DashboardCard>

          <DashboardCard title="Evolução de Faturamento" contentClassName="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={fatPorMes}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: any) => brl(Number(v))} />
                <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </DashboardCard>

          <DashboardCard title="Alertas por Período" contentClassName="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={alertasPorDia}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </DashboardCard>

          <DashboardCard title="Clientes por Classificação" contentClassName="h-[260px]">
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
          </DashboardCard>
        </div>

        <div className="mt-4">
          <DashboardCard title="Top 10 Clientes por Compras">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">#</th><th>Cartão</th><th>Rating</th><th>Status Manual</th>
                    <th className="text-right">Compras</th><th className="text-right">Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {(top10 as any[]).map((c, i) => (
                    <tr key={c.numero_cartao} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="font-mono">{c.numero_cartao}</td>
                      <td><RatingBadge rating={c.rating_final} /></td>
                      <td><StatusManualBadge status={c.status_manual} /></td>
                      <td className="text-right">{c.total_compras}</td>
                      <td className="text-right font-semibold">{brl(Number(c.total_gasto) || 0)}</td>
                    </tr>
                  ))}
                  {!top10.length && (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Sem dados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>
      </section>
      <ExecutiveReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        filters={filters}
        periodoLabel={periodLabel(period)}
        lojaLabel={lojaLabel}
      />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="border-border/70 shadow-sm transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold mt-0.5 truncate">{value}</div>
        </div>
        <div
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
          style={{
            background: accent ? `color-mix(in oklab, ${accent} 16%, transparent)` : "var(--muted)",
            color: accent ?? "var(--primary)",
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
