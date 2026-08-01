import { useMemo, useState } from "react";
import { DashboardCard } from "./DashboardCard";
import { PeriodFilter } from "./PeriodFilter";
import { ExportMenu } from "./ExportMenu";
import { PackageSearch, Loader2 } from "lucide-react";
import type { PeriodKey } from "@/lib/periods";

export type ProdutoRankItem = {
  produto: string;
  categoria: string | null;
  quantidade: number;
  valorPerdido: number;
  valorRecuperado: number;
  percentual: number;
  ocorrencias: number;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function ProductRanking({
  data,
  isLoading,
  period,
  onPeriodChange,
  pageSize = 10,
}: {
  data?: ProdutoRankItem[];
  isLoading?: boolean;
  period: PeriodKey;
  onPeriodChange: (k: PeriodKey) => void;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const rows = data ?? [];
  const maxQtd = useMemo(() => Math.max(1, ...rows.map((r) => r.quantidade)), [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = useMemo(() => rows.slice(current * pageSize, current * pageSize + pageSize), [rows, current, pageSize]);

  return (
    <DashboardCard
      title="Produtos Mais Furtados"
      icon={PackageSearch}
      action={
        <ExportMenu
          filename="produtos-mais-furtados"
          title="Produtos mais furtados"
          rows={rows}
          cols={[
            { key: "produto", header: "Produto" },
            { key: "categoria", header: "Categoria" },
            { key: "quantidade", header: "Quantidade" },
            { key: "percentual", header: "Percentual", format: (v: unknown) => pct(Number(v)) },
            { key: "valorPerdido", header: "Valor perdido", format: (v: unknown) => brl(Number(v)) },
            { key: "valorRecuperado", header: "Valor recuperado", format: (v: unknown) => brl(Number(v)) },

          ]}
        />
      }
    >
      <div className="space-y-3">
        <PeriodFilter value={period} onChange={(k) => { setPage(0); onPeriodChange(k); }} size="sm" />

        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando ranking…
          </div>
        ) : !rows.length ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Sem produtos registrados em ocorrências no período.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Produto</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right">%</th>
                    <th className="text-right">Perdido</th>
                    <th className="text-right">Recuperado</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.produto} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                      <td className="py-2 pr-2">
                        <div className="truncate font-medium">{r.produto}</div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(r.quantidade / maxQtd) * 100}%`, background: "var(--destructive)" }}
                          />
                        </div>
                      </td>
                      <td className="text-right font-semibold tabular-nums">{r.quantidade}</td>
                      <td className="text-right tabular-nums text-muted-foreground">{pct(r.percentual)}</td>
                      <td className="text-right tabular-nums">{brl(r.valorPerdido)}</td>
                      <td className="text-right tabular-nums text-[var(--rating-trusted)]">{brl(r.valorRecuperado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Página {current + 1} de {pages} · {rows.length} produtos
                </span>
                <span className="flex gap-2">
                  <button
                    className="rounded-md border px-2 py-1 disabled:opacity-40"
                    onClick={() => setPage(current - 1)}
                    disabled={current === 0}
                  >
                    Anterior
                  </button>
                  <button
                    className="rounded-md border px-2 py-1 disabled:opacity-40"
                    onClick={() => setPage(current + 1)}
                    disabled={current >= pages - 1}
                  >
                    Próxima
                  </button>
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}
