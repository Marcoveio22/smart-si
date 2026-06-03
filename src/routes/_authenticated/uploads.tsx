import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/uploads")({ component: UploadsPage });

const statusClr: Record<string, string> = {
  aguardando: "bg-muted text-muted-foreground",
  processando: "bg-[var(--rating-gold)]/20 text-[var(--rating-gold)]",
  concluido: "bg-[var(--rating-trusted)]/20 text-[var(--rating-trusted)]",
  erro: "bg-destructive/20 text-destructive",
};

function UploadsPage() {
  const qc = useQueryClient();
  const [diaria, setDiaria] = useState<File | null>(null);
  const [historico, setHistorico] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["upload-history"],
    queryFn: async () => (await supabase.from("processamentos").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const processar = async () => {
    if (!diaria || !historico) { toast.error("Envie os dois arquivos"); return; }
    setSubmitting(true);
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
      const { error } = await supabase.from("processamentos").insert({
        arquivo_diaria: diariaPath,
        arquivo_historico: histPath,
        status: "aguardando",
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success("Arquivos enviados! Aguardando processamento da engine.");
      setDiaria(null); setHistorico(null);
      qc.invalidateQueries({ queryKey: ["upload-history"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Upload de Arquivos</h1>
        <p className="text-sm text-muted-foreground">Envie as planilhas para processamento pela engine Python</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo Processamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FileSlot label="BASE_DIARIA.xlsx" file={diaria} setFile={setDiaria} />
          <FileSlot label="BASE_CLIENTES_HISTORICO.xlsx" file={historico} setFile={setHistorico} />
          <Button onClick={processar} disabled={submitting || !diaria || !historico} size="lg" className="w-full">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : <><UploadCloud className="h-4 w-4 mr-2" />PROCESSAR ARQUIVOS</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Uploads</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b bg-muted/30">
              <tr><th className="px-4 py-3">Data</th><th>Diária</th><th>Histórico</th><th>Status</th></tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="px-4 py-3 text-xs">{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                  <td className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{p.arquivo_diaria ?? "—"}</td>
                  <td className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{p.arquivo_historico ?? "—"}</td>
                  <td><span className={cn("text-xs font-semibold uppercase px-2 py-1 rounded", statusClr[p.status] ?? "bg-muted")}>{p.status}</span></td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum upload realizado</td></tr>}
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
