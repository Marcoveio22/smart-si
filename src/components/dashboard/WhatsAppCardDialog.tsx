import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/useTenant";
import { createOcorrenciaComProdutos } from "@/lib/api/ocorrencias.functions";
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
import { Copy, Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { DashboardFilters } from "@/lib/api/filters";

type Tipo = "normal" | "alerta";
type Template = "verde" | "amarelo" | "vermelho";
type Gravidade = "Baixa" | "Média" | "Alta";

function parseValor(v: string): number {
  return Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
}

/** dd/mm/yyyy hh:mm (ou hh:mm:ss) → ISO. Fallback: agora. */
function parseDataHora(v: string): string {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h, mi, s] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }
  const alt = new Date(v);
  return Number.isNaN(alt.getTime()) ? new Date().toISOString() : alt.toISOString();
}

interface NormalForm {
  cliente: string;
  lojaId: string;
  periodo: string;
  pdvs: string;
  produtosVerificados: string;
  status: "ok" | "suspeita" | "alerta";
  resumo: string;
}

interface AlertaForm {
  cliente: string;
  lojaId: string;
  dataHora: string;
  tipoOcorrencia: string;
  camera: string;
  produtos: string[];
  pagamento: string;
  prejuizo: string;
  recomendacao: string;
}

const defaultNormal: NormalForm = {
  cliente: "",
  lojaId: "",
  periodo: "",
  pdvs: "",
  produtosVerificados: "",
  status: "ok",
  resumo: "",
};

const defaultAlerta: AlertaForm = {
  cliente: "",
  lojaId: "",
  dataHora: new Date().toLocaleString("pt-BR"),
  tipoOcorrencia: "Furto",
  camera: "",
  produtos: [],
  pagamento: "Não registrado",
  prejuizo: "",
  recomendacao: "",
};

function statusLabel(s: NormalForm["status"]) {
  if (s === "ok") return "✅ Operação Normal";
  if (s === "alerta") return "🔴 Alerta";
  return "⚠️ Suspeita";
}

function accentColor(tpl: Template) {
  return tpl === "verde" ? "#25d366" : tpl === "amarelo" ? "#f59e0b" : "#ef4444";
}

function headerTitle(tipo: Tipo, tpl: Template) {
  if (tipo === "alerta") return "🚨 Alerta de Ocorrência";
  return tpl === "amarelo" ? "⚠️ Monitoramento — Suspeita" : "✅ Monitoramento Operacional";
}

const sep = "━━━━━━━━━━━━━━━━━";

function buildTexto(
  tipo: Tipo,
  tpl: Template,
  n: NormalForm & { lojaNome: string },
  a: AlertaForm & { lojaNome: string; gravidade: Gravidade },
  empresa: string,
) {
  const lines: string[] = [];
  if (tipo === "normal") {
    lines.push(headerTitle(tipo, tpl));
    lines.push(sep);
    lines.push(`🏪 *Cliente:* ${n.cliente || "—"}`);
    lines.push(`🏢 *Unidade:* ${n.lojaNome || "—"}`);
    lines.push(`🕐 *Período:* ${n.periodo || "—"}`);
    lines.push(`💳 *PDVs analisados:* ${n.pdvs || "—"}`);
    lines.push(`📦 *Produtos verificados:* ${n.produtosVerificados || "—"}`);
    lines.push(`📊 *Status:* ${statusLabel(n.status)}`);
    lines.push(sep);
    if (n.resumo) lines.push(`💡 ${n.resumo}`);
  } else {
    lines.push(headerTitle(tipo, tpl));
    lines.push(sep);
    lines.push(`🏪 *Cliente:* ${a.cliente || "—"}`);
    lines.push(`🏢 *Unidade:* ${a.lojaNome || "—"}`);
    lines.push(`🕐 *Data/Hora:* ${a.dataHora}`);
    lines.push(`⚠️ *Tipo:* ${a.tipoOcorrencia}`);
    lines.push(`📊 *Gravidade:* ${a.gravidade}`);
    lines.push(sep);
    lines.push(
      `Nossa equipe identificou uma ocorrência de *${a.tipoOcorrencia.toLowerCase()}* em ${a.lojaNome || "—"}.`,
    );
    if (a.camera) lines.push(`🎬 *Câmera:* ${a.camera}`);
    if (a.produtos.length) {
      lines.push("");
      lines.push(`📦 *${a.produtos.length} produto(s) identificado(s):*`);
      a.produtos.forEach((p) => lines.push(`  📌 ${p}`));
    }
    if (a.pagamento) lines.push(`💳 *Forma de pagamento:* ${a.pagamento}`);
    if (a.prejuizo) lines.push(`💰 *Prejuízo estimado:* R$ ${a.prejuizo}`);
    lines.push(sep);
    if (a.recomendacao) lines.push(`💡 *Recomendação:* ${a.recomendacao}`);
  }
  lines.push("");
  lines.push(`_Enviado por ${empresa} • Smart SI_`);
  return lines.join("\n");
}

/** Desenha o card num canvas e devolve um Blob PNG, para copiar como imagem. */
async function renderCardToBlob(texto: string, tpl: Template): Promise<Blob> {
  const linhas = texto.split("\n").map((l) => l.replace(/[*_]/g, ""));
  const w = 375;
  const h = linhas.length * 20 + 60;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  ctx.fillStyle = "#e5ddd5";
  ctx.fillRect(0, 0, w, h);

  const bx = 12;
  const by = 14;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(bx, by, w - 24, h - by - 20);
  ctx.fillStyle = accentColor(tpl);
  ctx.fillRect(bx, by, 4, h - by - 20);

  ctx.fillStyle = "#111827";
  ctx.font = "13px Segoe UI, Arial, sans-serif";
  let y = by + 24;
  linhas.forEach((l) => {
    ctx.fillText(l.slice(0, 58), bx + 18, y);
    y += 20;
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/png");
  });
}

export function WhatsAppCardDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters?: Partial<DashboardFilters>;
  onDone?: () => void;
}) {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const criarOcorrencia = useServerFn(createOcorrenciaComProdutos);

  const [tipo, setTipo] = useState<Tipo>("normal");
  const [template, setTemplate] = useState<Template>("verde");
  const [gravidade, setGravidade] = useState<Gravidade>("Alta");
  const [normal, setNormal] = useState<NormalForm>(defaultNormal);
  const [alerta, setAlerta] = useState<AlertaForm>(defaultAlerta);
  const [produtoInput, setProdutoInput] = useState("");
  const [texto, setTexto] = useState<string | null>(null);
  const empresa = "Smart SI";

  const lojas = (tenant?.lojas ?? []) as { id: string; nome: string }[];
  const lojaNome = (id: string) => lojas.find((l) => l.id === id)?.nome ?? "";

  const setTipoESincroniza = (t: Tipo) => {
    setTipo(t);
    setTemplate(t === "alerta" ? "vermelho" : "verde");
    setTexto(null);
  };

  const reset = () => {
    setNormal(defaultNormal);
    setAlerta(defaultAlerta);
    setTexto(null);
    setProdutoInput("");
    setTipo("normal");
    setTemplate("verde");
    setGravidade("Alta");
  };

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const gerar = useMutation({
    mutationFn: async () => {
      const n = { ...normal, lojaNome: lojaNome(normal.lojaId) };
      const a = { ...alerta, gravidade, lojaNome: lojaNome(alerta.lojaId) };

      if (tipo === "alerta") {
        if (!alerta.lojaId) throw new Error("Selecione a unidade (loja).");
        await criarOcorrencia({
          data: {
            lojaId: alerta.lojaId,
            numeroCartao: `ALERTA-${Date.now()}`,
            tipo: alerta.tipoOcorrencia,
            prioridade: gravidade,
            valorPerdido: parseValor(alerta.prejuizo),
            descricao: alerta.recomendacao || null,
            observacoes:
              [
                alerta.camera ? `Câmera: ${alerta.camera}` : null,
                alerta.pagamento ? `Forma de pagamento: ${alerta.pagamento}` : null,
              ]
                .filter(Boolean)
                .join(" | ") || null,
            origem: "Manual" as const,
            dataOcorrencia: parseDataHora(alerta.dataHora),
            produtos: alerta.produtos,
          },
        });
      }

      setTexto(buildTexto(tipo, template, n, a, empresa));
    },
    onSuccess: () => {
      toast.success(tipo === "alerta" ? "Ocorrência criada e mensagem gerada." : "Mensagem gerada.");
      if (tipo === "alerta") {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
        onDone?.();
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível gerar o card."),
  });

  const copiarTexto = async () => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado! Cole no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar — selecione e copie manualmente.");
    }
  };

  const copiarImagem = async () => {
    if (!texto) return;
    try {
      const blob = await renderCardToBlob(texto, template);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Imagem copiada! Cole no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar a imagem neste navegador.");
    }
  };

  const addProduto = () => {
    const v = produtoInput.trim();
    if (!v) return;
    setAlerta((s) => ({ ...s, produtos: [...s.produtos, v.toUpperCase()] }));
    setProdutoInput("");
  };
  const removeProduto = (i: number) =>
    setAlerta((s) => ({ ...s, produtos: s.produtos.filter((_, idx) => idx !== i) }));

  const previewLines = useMemo(() => (texto ? texto.split("\n") : []), [texto]);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerador de Card WhatsApp</DialogTitle>
          <DialogDescription>
            O envio é manual: gere a mensagem, copie o texto ou a imagem, e cole no WhatsApp do contato.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={tipo === "normal" ? "default" : "outline"}
            onClick={() => setTipoESincroniza("normal")}
          >
            📊 Monitoramento
          </Button>
          <Button
            type="button"
            variant={tipo === "alerta" ? "default" : "outline"}
            onClick={() => setTipoESincroniza("alerta")}
          >
            🚨 Alerta
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["verde", "amarelo", "vermelho"] as Template[]).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={template === t ? "default" : "outline"}
              onClick={() => setTemplate(t)}
            >
              {t === "verde" ? "🟢 Normal" : t === "amarelo" ? "🟡 Suspeita" : "🔴 Ocorrência"}
            </Button>
          ))}
        </div>

        {tipo === "normal" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={normal.cliente} onChange={(e) => setNormal((s) => ({ ...s, cliente: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={normal.lojaId} onValueChange={(v) => setNormal((s) => ({ ...s, lojaId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Período Analisado</Label>
              <Input
                value={normal.periodo}
                onChange={(e) => setNormal((s) => ({ ...s, periodo: e.target.value }))}
                placeholder="21/05/2026 — 18h às 20h"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Qtd. PDVs Analisados</Label>
                <Input value={normal.pdvs} onChange={(e) => setNormal((s) => ({ ...s, pdvs: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Qtd. Produtos Verificados</Label>
                <Input
                  value={normal.produtosVerificados}
                  onChange={(e) => setNormal((s) => ({ ...s, produtosVerificados: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status Operacional</Label>
              <Select
                value={normal.status}
                onValueChange={(v) => setNormal((s) => ({ ...s, status: v as NormalForm["status"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">✅ Operação Normal</SelectItem>
                  <SelectItem value="suspeita">⚠️ Suspeita</SelectItem>
                  <SelectItem value="alerta">🔴 Alerta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resumo Operacional</Label>
              <Textarea
                rows={3}
                value={normal.resumo}
                onChange={(e) => setNormal((s) => ({ ...s, resumo: e.target.value }))}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={alerta.cliente} onChange={(e) => setAlerta((s) => ({ ...s, cliente: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={alerta.lojaId} onValueChange={(v) => setAlerta((s) => ({ ...s, lojaId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Data / Hora</Label>
              <Input value={alerta.dataHora} onChange={(e) => setAlerta((s) => ({ ...s, dataHora: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Ocorrência</Label>
                <Select
                  value={alerta.tipoOcorrencia}
                  onValueChange={(v) => setAlerta((s) => ({ ...s, tipoOcorrencia: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Furto", "Roubo", "Fraude", "Dano", "Suspeito", "Outro"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gravidade</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["Baixa", "Média", "Alta"] as Gravidade[]).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant={gravidade === g ? "default" : "outline"}
                      onClick={() => setGravidade(g)}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Câmera</Label>
              <Input
                value={alerta.camera}
                onChange={(e) => setAlerta((s) => ({ ...s, camera: e.target.value }))}
                placeholder="Corredor 4 — CAM 07"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Produtos Envolvidos</Label>
              <div className="flex gap-2">
                <Input
                  value={produtoInput}
                  onChange={(e) => setProdutoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addProduto();
                    }
                  }}
                  placeholder="Nome do produto..."
                />
                <Button type="button" onClick={addProduto}>
                  + Add
                </Button>
              </div>
              {alerta.produtos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {alerta.produtos.map((p, i) => (
                    <span key={`${p}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                      📌 {p}
                      <button type="button" onClick={() => removeProduto(i)} aria-label={`Remover ${p}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Input
                  value={alerta.pagamento}
                  onChange={(e) => setAlerta((s) => ({ ...s, pagamento: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prejuízo Estimado (R$)</Label>
                <Input
                  value={alerta.prejuizo}
                  onChange={(e) => setAlerta((s) => ({ ...s, prejuizo: e.target.value }))}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Recomendação</Label>
              <Textarea
                rows={2}
                value={alerta.recomendacao}
                onChange={(e) => setAlerta((s) => ({ ...s, recomendacao: e.target.value }))}
              />
            </div>
          </div>
        )}

        {texto && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-lg p-3" style={{ background: "#e5ddd5" }}>
              <div
                className="rounded-lg border-l-4 p-3 text-sm leading-relaxed shadow-sm"
                style={{ borderColor: accentColor(template), background: "#ffffff", color: "#111827" }}
              >
                {previewLines.map((l, i) => (
                  <div
                    key={i}
                    dangerouslySetInnerHTML={{
                      __html:
                        l
                          .replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;")
                          .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
                          .replace(/_(.+?)_/g, "<em>$1</em>") || "&nbsp;",
                    }}
                  />
                ))}
              </div>
            </div>
            <Textarea value={texto} readOnly rows={5} className="font-mono text-xs" />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => close(false)}>
            Fechar
          </Button>
          {texto ? (
            <>
              <Button variant="secondary" onClick={copiarImagem}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Copiar Imagem
              </Button>
              <Button onClick={copiarTexto}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Texto
              </Button>
            </>
          ) : (
            <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
              {gerar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar Card
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
