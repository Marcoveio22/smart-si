import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ocorrencias")({ component: OcorrenciasPage });

const TIPOS = ["furto", "suspeita", "chargeback", "outro"];

function OcorrenciasPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["ocorrencias"],
    queryFn: async () => (await supabase.from("ocorrencias").select("*").order("data_ocorrencia", { ascending: false })).data ?? [],
  });

  const resolve = async (id: string) => {
    const { error } = await supabase.from("ocorrencias").update({ resolvida: true }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marcada como resolvida"); qc.invalidateQueries({ queryKey: ["ocorrencias"] }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ocorrências</h1>
          <p className="text-sm text-muted-foreground">Registro manual de eventos operacionais</p>
        </div>
        <OcorrenciaForm onDone={() => qc.invalidateQueries({ queryKey: ["ocorrencias"] })} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3">Cartão</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Data</th>
                <th>Status</th>
                <th className="px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono">{o.numero_cartao}</td>
                  <td><span className="text-xs uppercase font-semibold tracking-wider">{o.tipo}</span></td>
                  <td className="text-muted-foreground max-w-md truncate">{o.descricao}</td>
                  <td className="text-xs">{new Date(o.data_ocorrencia).toLocaleString("pt-BR")}</td>
                  <td>{o.resolvida ? <span className="text-xs text-[var(--rating-trusted)] font-semibold">RESOLVIDA</span> : <span className="text-xs text-[var(--destructive)] font-semibold">ABERTA</span>}</td>
                  <td className="px-4 flex gap-1">
                    <OcorrenciaForm existing={o} onDone={() => qc.invalidateQueries({ queryKey: ["ocorrencias"] })} trigger={<Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                    {!o.resolvida && <Button size="sm" variant="ghost" onClick={() => resolve(o.id)}><CheckCircle2 className="h-4 w-4" /></Button>}
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ocorrência registrada</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function OcorrenciaForm({ existing, onDone, trigger }: { existing?: any; onDone: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState(existing?.numero_cartao ?? "");
  const [tipo, setTipo] = useState(existing?.tipo ?? "suspeita");
  const [descricao, setDescricao] = useState(existing?.descricao ?? "");
  const [data, setData] = useState(existing?.data_ocorrencia?.slice(0, 16) ?? new Date().toISOString().slice(0, 16));

  const submit = async () => {
    const payload = { numero_cartao: numero, tipo, descricao, data_ocorrencia: new Date(data).toISOString() };
    const { error } = existing
      ? await supabase.from("ocorrencias").update(payload).eq("id", existing.id)
      : await supabase.from("ocorrencias").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(existing ? "Atualizada" : "Criada"); onDone(); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="h-4 w-4 mr-1" />Nova Ocorrência</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Editar Ocorrência" : "Nova Ocorrência"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Número do Cartão</Label><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} /></div>
          <div><Label>Data da Ocorrência</Label><Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
