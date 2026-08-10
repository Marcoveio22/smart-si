import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { getOcorrencias, createCobranca } from "@/lib/api/ocorrencias.functions";
import { queryKeys } from "@/lib/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DashboardFilters } from "@/lib/api/filters";

type Produto = { descricao: string | null; quantidade: number; valor: number };

/** Monta a mensagem em markdown do WhatsApp (mesmo formato usado na tela de Ocorrências). */
function buildMensagem(o: any, lojaNome: string, produtos: Produto[], observacao?: string) {
  const prioridadeEmoji: Record<string, string> = { Baixa: "🟢", Média: "🟡", Alta: "🟠", Crítica: "🔴" };
  const sep = "━━━━━━━━━━━━━━━━━";
  const lines: string[] = [];
  lines.push(`🚨 *Alerta de Ocorrência*`);
  lines.push(`_Smart SI • Sistema de Monitoramento_`);
  lines.push(sep);
  lines.push(`🏪 *Cartão:* ${o.numero_cartao ?? "—"}`);
  lines.push(`🏢 *Unidade:* ${lojaNome}`);
  lines.push(`🕐 *Data/Hora:* ${new Date(o.data_ocorrencia).toLocaleString("pt-BR")}`);
  lines.push(`⚠️ *Tipo:* ${String(o.tipo ?? "—").toUpperCase()}`);
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
        `  📌 ${p.descricao ?? "Produto"}${p.quantidade > 1 ? ` (x${p.quantidade})` : ""}${
          p.valor ? ` — R$ ${Number(p.valor).toFixed(2)}` : ""
        }`,
      ),
    );
    lines.push("");
  }
  if (Number(o.valor_perdido) > 0) lines.push(`💰 *Prejuízo estimado:* R$ ${Number(o.valor_perdido).toFixed(2)}`);
  if (o.responsavel) lines.push(`👤 *Responsável/Contato:* ${o.responsavel}`);
  if (observacao) lines.push(`📝 *Observação:* ${observacao}`);
  lines.push(sep);
  lines.push(`_Enviado por Smart SI • Sistema de Monitoramento_`);
  return lines.join("\n");
}

/** Converte *negrito* e _itálico_ em HTML só para o preview visual (o texto copiado permanece em markdown puro do WhatsApp). */
function previewHtml(text: string) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function WhatsAppChargeDialog({
  open,
  onOpenChange,
  filters,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Partial<DashboardFilters>;
  onDone?: () => void;
}) {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const fetchOcorrencias = useServerFn(getOcorrencias);
  const novaCobranca = useServerFn(createCobranca);

  const [ocorrenciaId, setOcorrenciaId] = useState("");
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [texto, setTexto] = useState("");

  const listFilters = { ...filters, page: 0, pageSize: 50 };
  const { data: lista, isLoading } = useQuery({
    queryKey: queryKeys.ocorrencias.lista(listFilters),
    queryFn: () => fetchOcorrencias({ data: listFilters }),
    enabled: open,
    staleTime: 60_000,
  });

  const ocorrencias = (lista?.rows ?? []) as any[];
  const selecionada = useMemo(() => ocorrencias.find((o) => o.id === ocorrenciaId), [ocorrencias, ocorrenciaId]);

  const lojaNome = (lojaId?: string | null) =>
    (tenant?.lojas ?? []).find((l: any) => l.id === lojaId)?.nome ?? selecionada?.loja_nome ?? "—";

  const reset = () => {
    setOcorrenciaId("");
    setValor("");
    setObservacao("");
    setTexto("");
  };

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const gerar = useMutation({
    mutationFn: async () => {
      if (!selecionada) throw new Error("Selecione uma ocorrência.");
      const valorNum =
        Number(valor.replace(/\./g, "").replace(",", ".")) || Number(selecionada.valor_perdido ?? 0);

      const { data: produtos } = await supabase
        .from("ocorrencia_produtos")
        .select("descricao, quantidade, valor")
        .eq("ocorrencia_id", selecionada.id);

      const msg = buildMensagem(
        { ...selecionada, valor_perdido: valorNum },
        lojaNome(selecionada.loja_id),
        (produtos ?? []) as Produto[],
        observacao || undefined,
      );
      setTexto(msg);

      if (valorNum > 0) {
        await novaCobranca({
          data: {
            ocorrenciaId: selecionada.id,
            clienteId: selecionada.cliente_id ?? null,
            valor: valorNum,
            formaEnvio: "WhatsApp",
            dataEnvio: new Date().toISOString(),
            whatsappEnviado: true,
            observacao: observacao || null,
          },
        });
      }

      // Abordagem otimista: gerar a mensagem já marca a data de cobrança.
      await supabase
        .from("ocorrencias")
        .update({ data_cobranca: new Date().toISOString() })
        .eq("id", selecionada.id);
    },
    onSuccess: () => {
      toast.success("Mensagem gerada. Copie e cole no WhatsApp.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível gerar a mensagem."),
  });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado! Cole no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar automaticamente — selecione e copie manualmente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cobrança via WhatsApp</DialogTitle>
          <DialogDescription>
            O envio é manual: gere a mensagem, copie e cole no WhatsApp do contato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ocorrência</Label>
            <Select
              value={ocorrenciaId}
              onValueChange={(v) => {
                setOcorrenciaId(v);
                setTexto("");
                const o = ocorrencias.find((x) => x.id === v);
                if (o?.valor_perdido) setValor(String(Number(o.valor_perdido).toFixed(2)).replace(".", ","));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Carregando…" : "Selecione a ocorrência"} />
              </SelectTrigger>
              <SelectContent>
                {ocorrencias.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {new Date(o.data_ocorrencia).toLocaleDateString("pt-BR")} · {o.numero_cartao} ·{" "}
                    {brl(Number(o.valor_perdido ?? 0))}
                  </SelectItem>
                ))}
                {!isLoading && !ocorrencias.length && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">Nenhuma ocorrência no período</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
          </div>

          {texto && (
            <div className="space-y-2">
              <div
                className="max-h-56 overflow-auto rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewHtml(texto) }}
              />
              <Textarea value={texto} readOnly rows={6} className="font-mono text-xs" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Fechar
          </Button>
          {texto ? (
            <Button onClick={copiar}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar texto
            </Button>
          ) : (
            <Button onClick={() => gerar.mutate()} disabled={gerar.isPending || !ocorrenciaId}>
              {gerar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar mensagem
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
