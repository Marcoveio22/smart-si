import { useMemo } from "react";
import { DashboardCard } from "./DashboardCard";
import { Progress } from "@/components/ui/progress";
import { Wallet, Send, HandCoins, Trophy, Percent, Loader2 } from "lucide-react";

export type FinanceiroResumo = {
  cobrancasPendentes: { qtd: number; valor: number };
  cobrancasEnviadas: { qtd: number; valor: number };
  cobrancasPagas: { qtd: number; valor: number };
  recebimentos: number;
  qtdRecebimentos: number;
  valorPerdido: number;
  valorRecuperado: number;
  taxaRecuperacao: number;
  porForma: { forma: string; valor: number }[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Row({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  detail?: string;
  accent: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/60 p-3">
      <span
        className="grid h-8 w-8 place-items-center rounded-md"
        style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-muted-foreground">{label}</span>
        {detail && <span className="block truncate text-[11px] text-muted-foreground/80">{detail}</span>}
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}

export function FinancialPanel({ data, isLoading }: { data?: FinanceiroResumo; isLoading?: boolean }) {
  const taxa = useMemo(() => Math.round((data?.taxaRecuperacao ?? 0) * 100), [data?.taxaRecuperacao]);

  return (
    <DashboardCard title="Painel Financeiro" icon={Wallet}>
      {isLoading || !data ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando dados financeiros…
        </div>
      ) : (
        <div className="space-y-3">
          <Row
            icon={Wallet}
            label="Cobranças pendentes"
            detail={`${data.cobrancasPendentes.qtd} cobrança(s)`}
            value={brl(data.cobrancasPendentes.valor)}
            accent="var(--rating-gold)"
          />
          <Row
            icon={Send}
            label="Cobranças enviadas"
            detail={`${data.cobrancasEnviadas.qtd} enviada(s) / em negociação`}
            value={brl(data.cobrancasEnviadas.valor)}
            accent="var(--chart-1)"
          />
          <Row
            icon={HandCoins}
            label="Recebimentos"
            detail={`${data.qtdRecebimentos} registro(s) de recuperação`}
            value={brl(data.recebimentos)}
            accent="var(--rating-trusted)"
          />
          <Row
            icon={Trophy}
            label="Valor recuperado"
            detail={`de ${brl(data.valorPerdido)} em perdas`}
            value={brl(data.valorRecuperado)}
            accent="var(--rating-diamond)"
          />

          <div className="rounded-lg border border-border/60 p-3">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                <Percent className="h-3.5 w-3.5" /> Taxa de recuperação
              </span>
              <span className="text-sm font-bold tabular-nums">{taxa}%</span>
            </div>
            <Progress value={Math.min(taxa, 100)} className="h-2" />
          </div>

          {!!data.porForma.length && (
            <div className="flex flex-wrap gap-2 pt-1">
              {data.porForma.map((f) => (
                <span key={f.forma} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                  {f.forma}: <strong className="text-foreground">{brl(f.valor)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
