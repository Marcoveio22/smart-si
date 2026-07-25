import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/processamentos")({ component: ProcessamentosPage });

const statusClr: Record<string, string> = {
  aguardando: "bg-muted text-muted-foreground",
  processando: "bg-[var(--rating-gold)]/20 text-[var(--rating-gold)]",
  concluido: "bg-[var(--rating-trusted)]/20 text-[var(--rating-trusted)]",
  erro: "bg-destructive/20 text-destructive",
};

function ProcessamentosPage() {
  const [selected, setSelected] = useState<any>(null);
  const { selectedLojaId } = useTenant();
  const { data: items = [] } = useQuery({
    queryKey: ["processamentos", selectedLojaId ?? "own"],
    queryFn: async () => {
      let q = supabase.from("processamentos").select("*").order("data_referencia", { ascending: false });
      if (selectedLojaId) q = q.eq("loja_id", selectedLojaId);
      return (await q).data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Processamentos</h1>
        <p className="text-sm text-muted-foreground">Histórico de execuções da engine de classificação</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th>Transações</th>
                <th>Faturamento</th>
                <th>RED</th>
                <th>TRUSTED</th>
                <th>Th. DIAMOND</th>
                <th>Th. GOLD</th>
                <th>Status</th>
                <th className="px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3">{new Date(p.data_referencia).toLocaleDateString("pt-BR")}</td>
                  <td>{p.total_transacoes}</td>
                  <td className="font-semibold">{Number(p.faturamento_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{p.clientes_red}</td>
                  <td>{p.clientes_trusted}</td>
                  <td>{Number(p.threshold_diamond).toLocaleString("pt-BR")}</td>
                  <td>{Number(p.threshold_gold).toLocaleString("pt-BR")}</td>
                  <td><span className={cn("text-xs font-semibold uppercase px-2 py-1 rounded", statusClr[p.status] ?? "bg-muted")}>{p.status}</span></td>
                  <td className="px-4"><Button size="sm" variant="ghost" onClick={() => setSelected(p)}><Eye className="h-4 w-4" /></Button></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum processamento</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Processamento {selected && new Date(selected.data_referencia).toLocaleDateString("pt-BR")}</DialogTitle></DialogHeader>
          {selected && (
            <div className="grid gap-2 text-sm">
              {Object.entries({
                Status: selected.status,
                "Total de Transações": selected.total_transacoes,
                Faturamento: Number(selected.faturamento_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                "Clientes RED": selected.clientes_red,
                "Clientes TRUSTED": selected.clientes_trusted,
                "Threshold DIAMOND": selected.threshold_diamond,
                "Threshold GOLD": selected.threshold_gold,
                "Arquivo Diária": selected.arquivo_diaria ?? "—",
                "Arquivo Histórico": selected.arquivo_historico ?? "—",
                "Mensagem de Erro": selected.erro_mensagem ?? "—",
                "Criado em": new Date(selected.created_at).toLocaleString("pt-BR"),
              }).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/50 py-2">
                  <span className="text-muted-foreground">{k}</span><span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
