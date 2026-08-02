import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getOcorrencias, createCobranca } from "@/lib/api/ocorrencias.functions";
import { queryKeys } from "@/lib/api/queryKeys";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RatingBadge } from "@/components/RatingBadge";
import { StatusManualBadge } from "@/components/StatusManualBadge";
import { OccurrenceStatusBadge } from "./OccurrenceStatusBadge";
import { OccurrenceDetailsModal } from "./OccurrenceDetailsModal";
import { AlertCircle, ExternalLink, FileText, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { DashboardFilters } from "@/lib/api/filters";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

export type RecurringClientRow = {
  cliente_id: string | null;
  numero_cartao: string;
  rating_final?: string | null;
  status_manual?: string | null;
  total_ocorrencias?: number | null;
  valor_perdido?: number | null;
  valor_recuperado?: number | null;
  ultima_ocorrencia?: string | null;
  dias_desde_ultima?: number | null;
};

export function RecurringClientModal({
  cliente,
  filters,
  open,
  onOpenChange,
}: {
  cliente: RecurringClientRow | null;
  filters: Partial<DashboardFilters>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOcorrencias = useServerFn(getOcorrencias);
  const novaCobranca = useServerFn(createCobranca);
  const [telefone, setTelefone] = useState("");
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const listFilters = useMemo(
    () => ({ ...filters, clienteId: cliente?.cliente_id ?? null, page: 0, pageSize: 30 }),
    [filters, cliente?.cliente_id],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.ocorrencias.lista(listFilters),
    queryFn: () => fetchOcorrencias({ data: listFilters }),
    enabled: open && !!cliente?.cliente_id,
    staleTime: 60_000,
  });

  const ocorrencias = (data?.rows ?? []) as any[];
  const produtos = useMemo(() => {
    const set = new Map<string, number>();
    for (const o of ocorrencias) {
      const nome = o.produto_principal ?? o.tipo_ocorrencia ?? null;
      if (nome) set.set(nome, (set.get(nome) ?? 0) + 1);
    }
    return [...set.entries()].sort((a, b) => b[1] - a[1]);
  }, [ocorrencias]);

  const ultima = ocorrencias[0];
  const initials = (cliente?.numero_cartao ?? "").replace(/\D/g, "").slice(-2) || "SI";
  const perdido = Number(cliente?.valor_perdido ?? 0);
  const recuperado = Number(cliente?.valor_recuperado ?? 0);

  const cobranca = useMutation({
    mutationFn: async () => {
      if (!ultima) throw new Error("Nenhuma ocorrência disponível para cobrança.");
      const valor = Number(ultima.valor_pendente ?? ultima.valor_perdido ?? 0);
      if (!valor) throw new Error("Ocorrência sem valor pendente.");
      return novaCobranca({
        data: {
          ocorrenciaId: ultima.id,
          clienteId: cliente?.cliente_id ?? null,
          valor,
          formaEnvio: "Dashboard",
          dataEnvio: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Cobrança registrada");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível gerar a cobrança"),
  });

  const enviarWhatsapp = () => {
    const texto = [
      "Olá! Identificamos ocorrências recorrentes vinculadas ao seu cartão em nossa loja autônoma.",
      `Cartão: ${cliente?.numero_cartao ?? "—"}`,
      `Ocorrências: ${cliente?.total_ocorrencias ?? ocorrencias.length}`,
      `Valor em aberto: ${brl(Math.max(perdido - recuperado, 0))}`,
      "Pedimos a gentileza de entrar em contato com a administração para regularização.",
    ].join("\n");
    const fone = telefone.replace(/\D/g, "");
    window.open(`https://wa.me/${fone ? `55${fone}` : ""}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Cliente recorrente</DialogTitle>
            <DialogDescription className="text-xs">
              Consolidado de ocorrências, produtos e valores do cliente no período filtrado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <div className="truncate font-mono text-sm font-semibold">{cliente?.numero_cartao ?? "—"}</div>
              <div className="flex flex-wrap items-center gap-2">
                <RatingBadge rating={cliente?.rating_final as any} />
                <StatusManualBadge status={cliente?.status_manual as any} />
              </div>
              <div className="text-[11px] text-muted-foreground">
                Última ocorrência: {dt(cliente?.ultima_ocorrencia)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Ocorrências" value={String(cliente?.total_ocorrencias ?? ocorrencias.length)} />
            <Metric label="Perdido" value={brl(perdido)} accent="var(--destructive)" />
            <Metric label="Recuperado" value={brl(recuperado)} accent="var(--rating-trusted)" />
            <Metric label="Em aberto" value={brl(Math.max(perdido - recuperado, 0))} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Apartamento / unidade" value={ultima?.responsavel ?? "Não cadastrado"} />
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone (WhatsApp)</div>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="h-8 text-xs"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!ultima}
              onClick={() => setDetalheId(ultima?.id ?? null)}
            >
              <ExternalLink className="h-4 w-4" /> Abrir ocorrência
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => cobranca.mutate()} disabled={cobranca.isPending || !ultima}>
              {cobranca.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Gerar cobrança
            </Button>
            <Button size="sm" className="gap-2" onClick={enviarWhatsapp}>
              <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-xs"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/clientes" });
              }}
            >
              Ver ficha completa
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Produtos envolvidos</div>
            {produtos.length ? (
              <div className="flex flex-wrap gap-1.5">
                {produtos.map(([nome, qtd]) => (
                  <span key={nome} className="rounded-md bg-muted px-2 py-1 text-[11px]">
                    {nome} · {qtd}
                  </span>
                ))}
              </div>
            ) : (
              <Empty>Sem produtos informados</Empty>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Histórico de ocorrências</div>
            {isLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {isError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4" />
                {(error as any)?.message ?? "Erro ao carregar histórico"}
              </div>
            )}
            {!isLoading && !isError && !ocorrencias.length && <Empty>Nenhuma ocorrência no período</Empty>}
            <div className="space-y-1">
              {ocorrencias.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDetalheId(o.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border/60 p-2 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <OccurrenceStatusBadge status={o.status} />
                      <span className="text-[11px] text-muted-foreground">{dt(o.data_ocorrencia)}</span>
                    </span>
                    <span className="block truncate text-xs">{o.descricao ?? o.tipo_ocorrencia ?? "Ocorrência"}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">{brl(Number(o.valor_perdido ?? 0))}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OccurrenceDetailsModal
        ocorrenciaId={detalheId}
        open={!!detalheId}
        onOpenChange={(v) => !v && setDetalheId(null)}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate rounded-md border border-border/60 px-2 py-1.5 text-xs">{value}</div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">{children}</div>;
}
