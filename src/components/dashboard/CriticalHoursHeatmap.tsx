import { useMemo } from "react";
import { DashboardCard } from "./DashboardCard";
import { Clock, Loader2 } from "lucide-react";

export type HeatCell = { diaSemana: number; hora: number; total: number; valor: number };

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const LABEL_HORAS = [0, 3, 6, 9, 12, 15, 18, 21];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CriticalHoursHeatmap({
  data,
  isLoading,
  action,
}: {
  data?: HeatCell[];
  isLoading?: boolean;
  action?: React.ReactNode;
}) {
  const { grid, max, total } = useMemo(() => {
    const g = new Map<string, HeatCell>();
    let m = 0;
    let t = 0;
    for (const c of data ?? []) {
      g.set(`${c.diaSemana}-${c.hora}`, c);
      m = Math.max(m, c.total);
      t += c.total;
    }
    return { grid: g, max: m, total: t };
  }, [data]);

  return (
    <DashboardCard title="Horários com Maior Incidência de Furtos" icon={Clock} action={action}>
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Montando mapa de calor…
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-[32px_repeat(24,minmax(0,1fr))] gap-[2px] pb-1">
                <div />
                {HORAS.map((h) => (
                  <div key={h} className="text-center text-[9px] text-muted-foreground">
                    {LABEL_HORAS.includes(h) ? String(h).padStart(2, "0") : ""}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[32px_repeat(24,minmax(0,1fr))] gap-[2px]">
                {DIAS.map((d, di) => (
                  <div key={d} className="contents">
                    <div className="pr-1 text-[10px] leading-5 text-muted-foreground">{d}</div>
                    {HORAS.map((h) => {
                      const c = grid.get(`${di}-${h}`);
                      const v = c?.total ?? 0;
                      const intensity = max > 0 ? v / max : 0;
                      return (
                        <div
                          key={h}
                          title={`${d} ${String(h).padStart(2, "0")}h — ${v} ocorrência(s)${c?.valor ? ` · ${brl(c.valor)}` : ""}`}
                          className="aspect-square rounded-sm transition-transform duration-150 hover:scale-125"
                          style={{
                            background:
                              v === 0
                                ? "var(--muted)"
                                : `color-mix(in oklab, var(--destructive) ${15 + intensity * 75}%, var(--muted))`,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <i className="h-3 w-3 rounded-sm" style={{ background: "var(--muted)" }} /> Nenhuma
            </span>
            {[0.25, 0.5, 0.75, 1].map((i) => (
              <span key={i} className="flex items-center gap-1">
                <i
                  className="h-3 w-3 rounded-sm"
                  style={{ background: `color-mix(in oklab, var(--destructive) ${15 + i * 75}%, var(--muted))` }}
                />
                {i === 1 ? "Muito alta" : i === 0.75 ? "Alta" : i === 0.5 ? "Média" : "Baixa"}
              </span>
            ))}
            <span className="ml-auto">{total} ocorrência(s) no período</span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
