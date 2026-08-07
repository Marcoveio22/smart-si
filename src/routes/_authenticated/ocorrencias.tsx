import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Pencil, MessageCircle, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ocorrencias")({ component: OcorrenciasPage });

const TIPOS = ["furto", "quebra", "suspeita", "chargeback", "outro"];
const PRIORIDADES = ["Baixa", "Média", "Alta", "Crítica"] as const;

type Produto = { descricao: string; quantidade: number; valor: number };

function OcorrenciasPage() {
  const qc = useQueryClient();
  const { selectedLojaId, tenant } = useTenant();
  const { data: items = [] } = useQuery({
    queryKey: ["ocorrencias", selectedLojaId ?? "own"],
    queryFn: async () => {
      let q = supabase.from("ocorrencias").select("*").order("data_ocorrencia", { ascending: false });
      if (selectedLojaId) q = q.eq("loja_id", selectedLojaId);
      return (await q).data ?? [];
    },
  });

  const resolve = async (id: string) => {
    const { error } = await supabase.from("ocorrencias").update({ resolvida: true }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Marcada como resolvida");
      qc.invalidateQueries({ queryKey: ["ocorrencias"] });
    }
  };

  const lojaNome = (lojaId: string | null) => tenant?.lojas.find((l) => l.id === lojaId)?.nome ?? "—";
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ocorrencias"] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ocorrências</h1>
          <p className="text-sm text-muted-foreground">Registro manual de eventos operacionais</p>
        </div>
        <OcorrenciaForm onDone={invalidate} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3">Cartão</th>
                <th>Tipo</th>
                <th>Prioridade</th>
                <th>Prejuízo</th>
                <th>Data</th>
                <th>Status</th>
                <th className="px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o: any) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono">{o.numero_cartao}</td>
                  <td>
                    <span className="text-xs uppercase font-semibold tracking-wider">{o.tipo}</span>
                  </td>
                  <td className="text-xs">{o.prioridade ?? "—"}</td>
                  <td className="text-xs">{o.valor_perdido ? `R$ ${Number(o.valor_perdido).toFixed(2)}` : "—"}</td>
                  <td className="text-xs">{new Date(o.data_ocorrencia).toLocaleString("pt-BR")}</td>
                  <td>
                    {o.resolvida ? (
                      <span className="text-xs text-[var(--rating-trusted)] font-semibold">RESOLVIDA</span>
                    ) : (
                      <span className="text-xs text-[var(--destructive)] font-semibold">ABERTA</span>
                    )}
                  </td>
                  <td className="px-4">
                    <div className="flex gap-1">
                      <OcorrenciaForm
                        existing={o}
                        onDone={invalidate}
                        trigger={
                          <Button size="sm" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <WhatsAppDialog ocorrencia={o} lojaNome={lojaNome(o.loja_id)} onSent={invalidate} />
                      {!o.resolvida && (
                        <Button size="sm" variant="ghost" onClick={() => resolve(o.id)}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma ocorrência registrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function OcorrenciaForm({ existing, onDone, trigger }: { existing?: any; onDone: () => void; trigger?: React.ReactNode }) {
  const { selectedLojaId, tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState(existing?.numero_cartao ?? "");
  const [tipo, setTipo] = useState(existing?.tipo ?? "suspeita");
  const [descricao, setDescricao] = useState(existing?.descricao ?? "");
  const [data, setData] = useState(existing?.data_ocorrencia?.slice(0, 16) ?? new Date().toISOString().slice(0, 16));
  const [valorPerdido, setValorPerdido] = useState(existing?.valor_perdido?.toString() ?? "0");
  const [prioridade, setPrioridade] = useState(existing?.prioridade ?? "Média");
  const [responsavel, setResponsavel] = useState(existing?.responsavel ?? "");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novoProduto, setNovoProduto] = useState("");

  useEffect(() => {
    if (!open || !existing) return;
    supabase
      .from("ocorrencia_produtos")
      .select("descricao, quantidade, valor")
      .eq("ocorrencia_id", existing.id)
      .then(({ data }) =>
        setProdutos(
          (data ?? []).map((p: any) => ({ descricao: p.descricao, quantidade: p.quantidade, valor: p.valor })),
        ),
      );
  }, [open, existing]);

  const addProduto = () => {
    if (!novoProduto.trim()) return;
    setProdutos((p) => [...p, { descricao: novoProduto.trim(), quantidade: 1, valor: 0 }]);
    setNovoProduto("");
  };
  const removeProduto = (i: number) => setProdutos((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    const lojaId = selectedLojaId ?? tenant?.lojaId ?? null;
    if (!existing && !lojaId) {
      toast.error("Selecione uma loja no cabeçalho antes de registrar");
      return;
    }
    const payload: any = {
      numero_cartao: numero,
      tipo,
      descricao,
      data_ocorrencia: new Date(data).toISOString(),
      valor_perdido: Number(valorPerdido) || 0,
      prioridade,
      responsavel,
    };
    if (!existing) payload.loja_id = lojaId;

    const { data: saved, error } = existing
      ? await supabase.from("ocorrencias").update(payload).eq("id", existing.id).select("id").single()
      : await supabase.from("ocorrencias").insert(payload).select("id").single();

    if (error || !saved) {
      toast.error(error?.message ?? "Erro ao salvar");
      return;
    }

    // Produtos: substitui a lista inteira (simples e suficiente para o volume esperado)
    await supabase.from("ocorrencia_produtos").delete().eq("ocorrencia_id", saved.id);
    if (produtos.length) {
      await supabase.from("ocorrencia_produtos").insert(
        produtos.map((p) => ({
          ocorrencia_id: saved.id,
          loja_id: existing?.loja_id ?? lojaId,
          descricao: p.descricao,
          quantidade: p.quantidade,
          valor: p.valor,
        })),
      );
    }

    toast.success(existing ? "Atualizada" : "Criada");
    onDone();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Nova Ocorrência
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar Ocorrência" : "Nova Ocorrência"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Número do Cartão</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data da Ocorrência</Label>
              <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label>Prejuízo estimado (R$)</Label>
              <Input type="number" step="0.01" value={valorPerdido} onChange={(e) => setValorPerdido(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Responsável / Contato</Label>
            <Input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome de quem será contatado"
            />
          </div>

          <div>
            <Label>Produtos identificados</Label>
            <div className="space-y-1 mt-1">
              {produtos.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded px-2 py-1">
                  <span className="flex-1">{p.descricao}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeProduto(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={novoProduto}
                onChange={(e) => setNovoProduto(e.target.value)}
                placeholder="Nome do produto"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProduto())}
              />
              <Button type="button" variant="outline" onClick={addProduto}>
                Adicionar
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildMensagem(o: any, lojaNome: string, produtos: Produto[]) {
  const prioridadeEmoji: Record<string, string> = { Baixa: "🟢", Média: "🟡", Alta: "🟠", Crítica: "🔴" };
  const sep = "━━━━━━━━━━━━━━━━━";
  const lines: string[] = [];
  lines.push(`🚨 *Alerta de Ocorrência*`);
  lines.push(`_Smart SI • Sistema de Monitoramento_`);
  lines.push(sep);
  lines.push(`🏪 *Cartão:* ${o.numero_cartao}`);
  lines.push(`🏢 *Unidade:* ${lojaNome}`);
  lines.push(`🕐 *Data/Hora:* ${new Date(o.data_ocorrencia).toLocaleString("pt-BR")}`);
  lines.push(`⚠️ *Tipo:* ${String(o.tipo).toUpperCase()}`);
  lines.push(`📊 *Prioridade:* ${prioridadeEmoji[o.prioridade] ?? ""} ${o.prioridade ?? "—"}`);
  lines.push(sep);
  if (o.descricao) {
    lines.push(o.descricao);
    lines.push("");
  }
  if (produtos.length) {
    lines.push(
      `📦 *${produtos.length} produto${produtos.length > 1 ? "s" : ""} identificado${produtos.length > 1 ? "s" : ""}:*`,
    );
    produtos.forEach((p) =>
      lines.push(
        `  📌 ${p.descricao}${p.quantidade > 1 ? ` (x${p.quantidade})` : ""}${p.valor ? ` — R$ ${Number(p.valor).toFixed(2)}` : ""}`,
      ),
    );
    lines.push("");
  }
  if (o.valor_perdido > 0) lines.push(`💰 *Prejuízo estimado:* R$ ${Number(o.valor_perdido).toFixed(2)}`);
  if (o.responsavel) lines.push(`👤 *Responsável/Contato:* ${o.responsavel}`);
  lines.push(sep);
  lines.push(`_Enviado por Smart SI • Sistema de Monitoramento_`);
  return lines.join("\n");
}

function WhatsAppDialog({ ocorrencia, lojaNome, onSent }: { ocorrencia: any; lojaNome: string; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");

  const gerar = async () => {
    const { data: produtos } = await supabase
      .from("ocorrencia_produtos")
      .select("descricao, quantidade, valor")
      .eq("ocorrencia_id", ocorrencia.id);
    setTexto(buildMensagem(ocorrencia, lojaNome, (produtos ?? []) as Produto[]));
    setOpen(true);
    // Abordagem otimista: gerar a mensagem já marca a cobrança como feita.
    const { error } = await supabase
      .from("ocorrencias")
      .update({ data_cobranca: new Date().toISOString() })
      .eq("id", ocorrencia.id);
    if (!error) onSent();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado! Cole no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar automaticamente — selecione e copie manualmente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" onClick={gerar}>
        <MessageCircle className="h-4 w-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensagem para WhatsApp</DialogTitle>
        </DialogHeader>
        <Textarea value={texto} readOnly rows={14} className="font-mono text-xs" />
        <DialogFooter>
          <Button onClick={copiar}>
            <Copy className="h-4 w-4 mr-1" />
            Copiar texto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
