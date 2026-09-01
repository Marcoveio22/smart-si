import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { gerarRelatorioDiario } from "@/lib/relatorioDiario.functions";

function base64ToBlob(base64: string, mime: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
}

export function DailyReportPanel({ lojaId, lojaLabel }: { lojaId: string | null; lojaLabel: string }) {
  const fetchRelatorio = useServerFn(gerarRelatorioDiario);
  const [dia, setDia] = useState<"hoje" | "ontem">("hoje");
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<{
    data: string;
    totalTransacoes: number;
    totalClientes: number;
    alertas: number;
    faturamento: number;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const gerar = async () => {
    if (!lojaId) {
      setErro("Selecione uma loja específica no topo do dashboard para gerar o relatório.");
      return;
    }
    setLoading(true);
    setErro(null);
    setResumo(null);
    try {
      const res = await fetchRelatorio({ data: { loja_id: lojaId, dia } });
      const blob = base64ToBlob(
        res.base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setResumo(res.resumo);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardCard title="Relatório Diário" icon={FileSpreadsheet}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gera a planilha de conferência (base diária, alertas, monitoramento e clientes classificados) para {lojaLabel}.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={dia} onValueChange={(v) => setDia(v as "hoje" | "ontem")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="ontem">Dia anterior</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={gerar} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Gerar e baixar
          </Button>
        </div>

        {erro && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </div>
        )}
        {resumo && (
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
            <p className="font-medium">
              {resumo.data} — {resumo.totalTransacoes} transações · {resumo.totalClientes} clientes · {resumo.alertas} alertas
            </p>
            <p className="text-muted-foreground">
              Faturamento do dia: {Number(resumo.faturamento).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
