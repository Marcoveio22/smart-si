import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRelatorioExecutivo } from "@/lib/api/dashboard.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportCSV, exportExcel, exportPDF } from "@/lib/export";
import { FileSpreadsheet, FileText, FileType, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import type { DashboardFilters } from "@/lib/api/filters";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function ExecutiveReportDialog({
  open,
  onOpenChange,
  filters,
  periodoLabel,
  lojaLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: Partial<DashboardFilters>;
  periodoLabel: string;
  lojaLabel: string;
}) {
  const fetchRelatorio = useServerFn(getRelatorioExecutivo);
  const { data, isLoading } = useQuery({
    queryKey: ["relatorio", "executivo", filters],
    queryFn: () => fetchRelatorio({ data: filters }),
    enabled: open,
    staleTime: 60_000,
  });

  const subtitle = `${lojaLabel} · ${periodoLabel} · gerado em ${new Date().toLocaleString("pt-BR")}`;

  const summary = useMemo(
    () =>
      data
        ? [
            { label: "Faturamento do período", value: brl(data.faturamentoTotal) },
            { label: "Ocorrências (total)", value: String(data.ocorrencias.total) },
            { label: "Ocorrências abertas", value: String(data.ocorrencias.abertas) },
            { label: "Ocorrências finalizadas", value: String(data.ocorrencias.finalizadas) },
            { label: "Valor perdido", value: brl(data.ocorrencias.valorPerdido) },
            { label: "Valor recuperado", value: brl(data.ocorrencias.valorRecuperado) },
            { label: "Taxa de recuperação", value: pct(data.financeiro.taxaRecuperacao) },
            { label: "Cobranças pendentes", value: brl(data.financeiro.cobrancasPendentes.valor) },
            { label: "Cobranças enviadas", value: brl(data.financeiro.cobrancasEnviadas.valor) },
            { label: "Recebimentos", value: brl(data.financeiro.recebimentos) },
          ]
        : [],
    [data],
  );

  const produtoCols = [
    { key: "produto", header: "Produto" },
    { key: "quantidade", header: "Qtd" },
    { key: "percentual", header: "%", format: (v: unknown) => pct(Number(v)) },
    { key: "valorPerdido", header: "Perdido", format: (v: unknown) => brl(Number(v)) },
    { key: "valorRecuperado", header: "Recuperado", format: (v: unknown) => brl(Number(v)) },
  ] as any;

  const recorrenteCols = [
    { key: "numero_cartao", header: "Cartão" },
    { key: "rating_final", header: "Rating" },
    { key: "total_ocorrencias", header: "Ocorrências" },
    { key: "valor_perdido", header: "Perdido", format: (v: unknown) => brl(Number(v ?? 0)) },
    { key: "valor_recuperado", header: "Recuperado", format: (v: unknown) => brl(Number(v ?? 0)) },
    { key: "dias_desde_ultima", header: "Dias desde a última" },
  ] as any;

  const flatRows = useMemo(() => (data ? summary.map((s) => ({ indicador: s.label, valor: s.value })) : []), [data, summary]);
  const indicadorCols = [
    { key: "indicador", header: "Indicador" },
    { key: "valor", header: "Valor" },
  ] as any;

  const run = async (fn: () => void | Promise<void>) => {
    try {
      await fn();
      toast.success("Relatório gerado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar relatório.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relatório Executivo</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Consolidando dados…
          </div>
        ) : (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Resumo</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {summary.map((s) => (
                  <div key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border/60 px-3 py-2 text-xs">
                    <span className="truncate text-muted-foreground">{s.label}</span>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Produtos mais furtados ({data.produtos.length})</h3>
              {data.produtos.length ? (
                <ul className="space-y-1 text-xs">
                  {data.produtos.slice(0, 8).map((p: any) => (
                    <li key={p.produto} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <span className="truncate">{p.produto}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {p.quantidade} · {pct(p.percentual)} · {brl(p.valorPerdido)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Sem produtos no período.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Clientes recorrentes ({data.recorrentes.length})</h3>
              {data.recorrentes.length ? (
                <ul className="space-y-1 text-xs">
                  {data.recorrentes.slice(0, 8).map((c: any) => (
                    <li key={c.cliente_id ?? c.numero_cartao} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <span className="truncate font-mono">{c.numero_cartao}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.total_ocorrencias} ocorrências · {brl(Number(c.valor_perdido ?? 0))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum cliente recorrente no período.</p>
              )}
            </section>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!data}
            onClick={() =>
              run(() =>
                exportPDF(
                  "Relatório Executivo — SMART SI",
                  subtitle,
                  [
                    { title: "Resumo de ocorrências e financeiro", cols: indicadorCols, rows: flatRows },
                    { title: "Produtos mais furtados", cols: produtoCols, rows: data!.produtos },
                    { title: "Clientes recorrentes", cols: recorrenteCols, rows: data!.recorrentes as any[] },
                  ],
                  "relatorio-executivo",
                ),
              )
            }
          >
            <FileType className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data}
            onClick={() => run(() => exportExcel(data!.produtos as any[], produtoCols, "relatorio-produtos", "Produtos"))}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data}
            onClick={() => run(() => exportCSV(flatRows as any[], indicadorCols, "relatorio-executivo"))}
          >
            <FileText className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button
            size="sm"
            disabled={!data}
            onClick={() => {
              const corpo = summary.map((s) => `${s.label}: ${s.value}`).join("\n");
              window.location.href = `mailto:?subject=${encodeURIComponent(
                `Relatório Executivo — ${lojaLabel} (${periodoLabel})`,
              )}&body=${encodeURIComponent(`${subtitle}\n\n${corpo}`)}`;
            }}
          >
            <Mail className="mr-2 h-4 w-4" /> Enviar por e-mail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
