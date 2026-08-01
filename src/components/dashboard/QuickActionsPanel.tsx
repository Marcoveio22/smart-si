import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOcorrencias, createCobranca } from "@/lib/api/ocorrencias.functions";
import { queryKeys } from "@/lib/api/queryKeys";
import { DashboardCard } from "./DashboardCard";
import { QuickActionCard, type QuickAction } from "./QuickActionCard";
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
import { MessageCircle, FileText, Send, PlusCircle, Zap, Loader2 } from "lucide-react";
import { cobrancaPDF } from "@/lib/export";
import { toast } from "sonner";
import type { DashboardFilters } from "@/lib/api/filters";

type Mode = "whatsapp" | "pdf" | null;

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function QuickActionsPanel({
  filters,
  onOpenReport,
}: {
  filters: Partial<DashboardFilters>;
  onOpenReport: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(null);
  const [ocorrenciaId, setOcorrenciaId] = useState<string>("");
  const [valor, setValor] = useState<string>("");
  const [telefone, setTelefone] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");

  const fetchOcorrencias = useServerFn(getOcorrencias);
  const novaCobranca = useServerFn(createCobranca);

  const listFilters = { ...filters, page: 0, pageSize: 50 };
  const { data: lista, isLoading } = useQuery({
    queryKey: queryKeys.ocorrencias.lista(listFilters),
    queryFn: () => fetchOcorrencias({ data: listFilters }),
    enabled: mode !== null,
    staleTime: 60_000,
  });

  const ocorrencias = (lista?.rows ?? []) as any[];
  const selecionada = useMemo(() => ocorrencias.find((o) => o.id === ocorrenciaId), [ocorrencias, ocorrenciaId]);

  const reset = () => {
    setMode(null);
    setOcorrenciaId("");
    setValor("");
    setTelefone("");
    setObservacao("");
  };

  const registrar = useMutation({
    mutationFn: async () => {
      if (!selecionada) throw new Error("Selecione uma ocorrência.");
      const valorNum = Number(valor.replace(/\./g, "").replace(",", ".")) || Number(selecionada.valor_perdido ?? 0);
      if (!valorNum) throw new Error("Informe o valor da cobrança.");

      if (mode === "pdf") {
        await cobrancaPDF({
          loja: selecionada.loja_nome ?? "—",
          cartao: selecionada.numero_cartao ?? "—",
          descricao: selecionada.descricao ?? selecionada.tipo ?? "Ocorrência registrada",
          valor: valorNum,
          data: new Date(selecionada.data_ocorrencia).toLocaleString("pt-BR"),
          observacao: observacao || undefined,
        });
      }

      await novaCobranca({
        data: {
          ocorrenciaId: selecionada.id,
          clienteId: selecionada.cliente_id ?? null,
          valor: valorNum,
          formaEnvio: mode === "whatsapp" ? "WhatsApp" : "PDF",
          dataEnvio: new Date().toISOString(),
          whatsappEnviado: mode === "whatsapp",
          observacao: observacao || null,
        },
      });

      if (mode === "whatsapp") {
        const texto = [
          "Olá! Identificamos uma ocorrência em nossa loja autônoma.",
          `Cartão: ${selecionada.numero_cartao ?? "—"}`,
          `Data: ${new Date(selecionada.data_ocorrencia).toLocaleString("pt-BR")}`,
          `Valor devido: ${brl(valorNum)}`,
          observacao ? `Obs.: ${observacao}` : "",
          "Pedimos a gentileza de regularizar o valor com a administração.",
        ]
          .filter(Boolean)
          .join("\n");
        const fone = telefone.replace(/\D/g, "");
        window.open(`https://wa.me/${fone ? `55${fone}` : ""}?text=${encodeURIComponent(texto)}`, "_blank");
      }
    },
    onSuccess: () => {
      toast.success("Cobrança registrada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      reset();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível registrar a cobrança."),
  });

  const actions: QuickAction[] = [
    {
      icon: MessageCircle,
      label: "Gerar cobrança via WhatsApp",
      hint: "Registrar e enviar notificação",
      onClick: () => setMode("whatsapp"),
    },
    { icon: FileText, label: "Gerar cobrança em PDF", hint: "Gerar documento para o síndico", onClick: () => setMode("pdf") },
    { icon: Send, label: "Enviar relatório", hint: "Relatório executivo do período", onClick: onOpenReport },
    {
      icon: PlusCircle,
      label: "Nova ocorrência",
      hint: "Registrar novo caso",
      onClick: () => navigate({ to: "/ocorrencias" }),
    },
  ];

  return (
    <>
      <DashboardCard title="Ações Rápidas" icon={Zap}>
        <div className="grid gap-2">
          {actions.map((a) => (
            <QuickActionCard key={a.label} action={a} />
          ))}
        </div>
      </DashboardCard>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === "whatsapp" ? "Cobrança via WhatsApp" : "Cobrança em PDF"}</DialogTitle>
            <DialogDescription>
              A cobrança é registrada no financeiro e vinculada à ocorrência selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Ocorrência</Label>
              <Select value={ocorrenciaId} onValueChange={(v) => {
                setOcorrenciaId(v);
                const o = ocorrencias.find((x) => x.id === v);
                if (o?.valor_perdido) setValor(String(Number(o.valor_perdido).toFixed(2)).replace(".", ","));
              }}>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </div>
              {mode === "whatsapp" && (
                <div className="space-y-1.5">
                  <Label>Telefone (DDD + número)</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11999999999" inputMode="tel" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
            <Button onClick={() => registrar.mutate()} disabled={registrar.isPending || !ocorrenciaId}>
              {registrar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "whatsapp" ? "Registrar e abrir WhatsApp" : "Gerar PDF e registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
