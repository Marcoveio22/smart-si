import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { processarArquivos, getConsolidadoUrl } from "@/lib/honestguard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/uploads")({ component: UploadsPage });

const statusClr: Record<string, string> = {
  aguardando: "bg-muted text-muted-foreground",
  processando: "bg-[var(--rating-gold)]/20 text-[var(--rating-gold)]",
  concluido: "bg-[var(--rating-trusted)]/20 text-[var(--rating-trusted)]",
  erro: "bg-destructive/20 text-destructive",
};

type Summary = {
  totalTransacoes: number; totalClientes: number;
  diamond: number; gold: number; silver: number; red: number; trusted: number;
  alertas: number; faturamento: number;
  linhasLidas?: number; linhasProcessadas?: number; linhasExportadas?: number;
  consolidadoNome?: string; consolidadoPath?: string;
  cartoesUnicosPlanilha?: number; clientesAtualizados?: number; clientesNoBanco?: number; sincronizado?: boolean;
};


function UploadsPage() {
  const qc = useQueryClient();
  const processar = useServerFn(processarArquivos);
  const getUrl = useServerFn(getConsolidadoUrl);

  const baixarConsolidado = async (path: string) => {
    try {
      const { url } = await getUrl({ data: { path } });
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e.message ?? "Erro ao gerar link"); }
  };
  const [diaria, setDiaria] = useState<File | null>(null);
  const [historico, setHistorico] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");

  const { data: history = [] } = useQuery({
    queryKey: ["upload-history"],
    queryFn: async () => (await supabase.from("processamentos").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: phase === "processing" ? 2000 : false,
  });

  const run = async () => {
    if (!diaria || !historico) { toast.error("Envie os dois arquivos"); return; }
    setPhase("uploading"); setSummary(null); setErrMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ts = Date.now();
      const diariaPath = `${user?.id}/${ts}/BASE_DIARIA.xlsx`;
      const histPath = `${user?.id}/${ts}/BASE_CLIENTES_HISTORICO.xlsx`;
      const [u1, u2] = await Promise.all([
        supabase.storage.from("excel-uploads").upload(diariaPath, diaria, { upsert: true }),
        supabase.storage.from("excel-uploads").upload(histPath, historico, { upsert: true }),
      ]);
      if (u1.error) throw u1.error;
      if (u2.error) throw u2.error;

      const { data: prof } = await supabase.from("profiles").select("loja_id").eq("id", user!.id).maybeSingle();
      const { data: proc, error } = await supabase.from("processamentos").insert({
        arquivo_diaria: diariaPath, arquivo_historico: histPath,
        status: "aguardando", created_by: user?.id, loja_id: prof?.loja_id ?? null,
      }).select("id").single();
      if (error) throw error;

      setPhase("processing");
      qc.invalidateQueries({ queryKey: ["upload-history"] });
      const res = await processar({ data: { processamentoId: proc.id, arquivoDiaria: diariaPath, arquivoHistorico: histPath } });
      setSummary(res);
      setPhase("done");
      toast.success("Processamento concluído!");
      setDiaria(null); setHistorico(null);
      qc.invalidateQueries({ queryKey: ["upload-history"] });
    } catch (e: any) {
      setErrMsg(e.message ?? "Erro desconhecido");
      setPhase("error");
      toast.error(e.message ?? "Erro ao processar");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Processamento Diário</h1>
        <p className="text-sm text-muted-foreground">Envie as planilhas Base Diária e Base Histórica para execução da engine HonestGuard</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo Processamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FileSlot label="Arquivo Diário (BASE_DIARIA.xlsx)" file={diaria} setFile={setDiaria} />
          <FileSlot label="Arquivo Histórico (BASE_CLIENTES_HISTORICO.xlsx)" file={historico} setFile={setHistorico} />

          <Button onClick={run} disabled={phase === "uploading" || phase === "processing" || !diaria || !historico} size="lg" className="w-full">
            {phase === "uploading" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando arquivos...</>}
            {phase === "processing" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando engine HonestGuard...</>}
            {(phase === "idle" || phase === "done" || phase === "error") && <><UploadCloud className="h-4 w-4 mr-2" />PROCESSAR ARQUIVOS</>}
          </Button>

          {phase === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{errMsg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {summary && (
        <Card className="border-[var(--rating-trusted)]/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--rating-trusted)]" />Resumo do Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(summary.linhasLidas != null) && (
              <div className="mb-3 p-3 rounded-md bg-muted/40 text-xs font-mono grid grid-cols-3 gap-2">
                <span>Linhas lidas: <b>{summary.linhasLidas}</b></span>
                <span>Processadas: <b>{summary.linhasProcessadas}</b></span>
                <span>Exportadas: <b>{summary.linhasExportadas}</b></span>
              </div>
            )}
            {summary.cartoesUnicosPlanilha != null && (
              <div className={cn(
                "mb-3 p-3 rounded-md text-xs space-y-1 border",
                summary.sincronizado ? "bg-[var(--rating-trusted)]/10 border-[var(--rating-trusted)]/40" : "bg-destructive/10 border-destructive/40"
              )}>
                <div className="flex items-center gap-2 font-semibold">
                  {summary.sincronizado
                    ? <><CheckCircle2 className="h-4 w-4 text-[var(--rating-trusted)]" />Sincronização OK</>
                    : <><AlertCircle className="h-4 w-4 text-destructive" />Divergência de sincronização</>}
                </div>
                <div>Cartões únicos na planilha: <b>{summary.cartoesUnicosPlanilha}</b></div>
                <div>Clientes atualizados nesta execução: <b>{summary.clientesAtualizados}</b></div>
                <div>Clientes encontrados no banco: <b>{summary.clientesNoBanco}</b></div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Transações" value={summary.totalTransacoes} />
              <Stat label="Clientes" value={summary.totalClientes} />
              <Stat label="Faturamento" value={summary.faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Stat label="Alertas" value={summary.alertas} accent="destructive" />
              <Stat label="DIAMOND" value={summary.diamond} accent="diamond" />
              <Stat label="GOLD" value={summary.gold} accent="gold" />
              <Stat label="SILVER" value={summary.silver} accent="silver" />
              <Stat label="RED" value={summary.red} accent="red" />
              <Stat label="TRUSTED" value={summary.trusted} accent="trusted" />
            </div>

            {summary.consolidadoPath && (
              <Button onClick={() => baixarConsolidado(summary.consolidadoPath!)} size="lg" className="w-full mt-4">
                <Download className="h-4 w-4 mr-2" />Baixar Excel Consolidado
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Processamentos</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b bg-muted/30">
              <tr><th className="px-4 py-3">Data</th><th>Transações</th><th>RED</th><th>TRUSTED</th><th>Status</th><th>Arquivo</th></tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="px-4 py-3 text-xs">{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                  <td>{p.total_transacoes ?? 0}</td>
                  <td>{p.clientes_red ?? 0}</td>
                  <td>{p.clientes_trusted ?? 0}</td>
                  <td>
                    <span className={cn("text-xs font-semibold uppercase px-2 py-1 rounded inline-flex items-center gap-1", statusClr[p.status] ?? "bg-muted")}>
                      {p.status === "processando" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {p.status}
                    </span>
                  </td>
                  <td className="pr-4">
                    {p.arquivo_consolidado_path ? (
                      <Button size="sm" variant="ghost" onClick={() => baixarConsolidado(p.arquivo_consolidado_path!)}>
                        <Download className="h-3 w-3 mr-1" />Baixar
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum processamento</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function FileSlot({ label, file, setFile }: { label: string; file: File | null; setFile: (f: File | null) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={cn("border-2 border-dashed rounded-lg p-4 flex items-center gap-3", file ? "border-primary/50 bg-primary/5" : "border-border")}>
        <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
        <Input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="border-0 p-0 h-auto bg-transparent" />
        {file && <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(1)} KB</span>}
      </div>
    </div>
  );
}

const accentClr: Record<string, string> = {
  diamond: "text-[var(--rating-diamond)]",
  gold: "text-[var(--rating-gold)]",
  silver: "text-[var(--rating-silver)]",
  red: "text-[var(--rating-red)]",
  trusted: "text-[var(--rating-trusted)]",
  destructive: "text-destructive",
};

function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={cn("text-xl font-bold mt-1", accent && accentClr[accent])}>{value}</div>
    </div>
  );
}
