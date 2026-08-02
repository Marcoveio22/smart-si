import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getOcorrencia } from "@/lib/api/ocorrencias.functions";
import { queryKeys } from "@/lib/api/queryKeys";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { OccurrenceStatusBadge, OccurrenceStatusSelect } from "./OccurrenceStatusBadge";
import { ImageGalleryModal } from "./ImageGalleryModal";
import { Images, ExternalLink, PackageSearch, Clock, Store, AlertCircle } from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

export function OccurrenceDetailsModal({
  ocorrenciaId,
  open,
  onOpenChange,
}: {
  ocorrenciaId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const fetchOcorrencia = useServerFn(getOcorrencia);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.ocorrencias.detalhe(ocorrenciaId ?? "none"),
    queryFn: () => fetchOcorrencia({ data: { id: ocorrenciaId! } }),
    enabled: open && !!ocorrenciaId,
    staleTime: 30_000,
  });

  const oc = data?.ocorrencia as any;
  const imagens = useMemo(() => (data?.imagens ?? []) as any[], [data]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes da ocorrência</DialogTitle>
            <DialogDescription className="text-xs">
              Histórico, produtos e situação financeira registrados no banco.
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {(error as any)?.message ?? "Erro ao carregar a ocorrência"}
            </div>
          )}

          {oc && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <OccurrenceStatusBadge status={oc.status} />
                  <span className="text-xs text-muted-foreground">{dt(oc.data_ocorrencia)}</span>
                  {oc.prioridade && <span className="text-xs text-muted-foreground">· {oc.prioridade}</span>}
                </div>
                <div className="text-sm font-medium">{oc.descricao ?? oc.tipo_ocorrencia ?? "Ocorrência registrada"}</div>
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span className="flex items-center gap-1 truncate">
                    <Store className="h-3 w-3" /> {oc.loja_nome ?? "—"}
                  </span>
                  <span className="flex items-center gap-1 truncate font-mono">Cartão {oc.numero_cartao ?? "—"}</span>
                  <span className="flex items-center gap-1 truncate">
                    <PackageSearch className="h-3 w-3" /> {oc.produto_principal ?? "Produto não informado"}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <Clock className="h-3 w-3" /> {oc.hora != null ? `${String(oc.hora).padStart(2, "0")}h` : "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Metric label="Perdido" value={brl(Number(oc.valor_perdido ?? 0))} />
                <Metric label="Recuperado" value={brl(Number(oc.valor_recuperado ?? 0))} accent="var(--rating-trusted)" />
                <Metric label="Pendente" value={brl(Number(oc.valor_pendente ?? 0))} accent="var(--destructive)" />
              </div>

              <div className="space-y-2">
                <Label>Status da ocorrência</Label>
                <OccurrenceStatusSelect id={oc.id} status={oc.status} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setGalleryOpen(true)}>
                  <Images className="h-4 w-4" /> Ver imagens{imagens.length ? ` (${imagens.length})` : ""}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate({ to: "/ocorrencias" });
                  }}
                >
                  <ExternalLink className="h-4 w-4" /> Abrir em Ocorrências
                </Button>
              </div>

              <Separator />

              <Block title="Produtos envolvidos">
                {(data?.produtos ?? []).length ? (
                  <ul className="space-y-1 text-xs">
                    {(data!.produtos as any[]).map((p) => (
                      <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <span className="truncate">{p.produtos?.nome ?? p.descricao ?? "Produto"}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {Number(p.quantidade ?? 0)}x · {brl(Number(p.valor ?? 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Nenhum produto vinculado</Empty>
                )}
              </Block>

              <Block title="Histórico de status">
                {(data?.historicoStatus ?? []).length ? (
                  <ol className="space-y-2">
                    {(data!.historicoStatus as any[]).map((h) => (
                      <li key={h.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-xs">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="min-w-0">
                          <span className="font-medium">{h.status_anterior ? `${h.status_anterior} → ` : ""}{h.status_novo}</span>
                          <span className="block text-muted-foreground">{dt(h.data_hora)}</span>
                          {h.observacao && <span className="block text-muted-foreground">{h.observacao}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Empty>Sem transições registradas</Empty>
                )}
              </Block>

              <Block title="Cobranças e recebimentos">
                {(data?.cobrancas ?? []).length || (data?.recuperacoes ?? []).length ? (
                  <ul className="space-y-1 text-xs">
                    {(data!.cobrancas as any[]).map((c) => (
                      <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <span className="truncate">Cobrança · {c.status}{c.forma_envio ? ` · ${c.forma_envio}` : ""}</span>
                        <span className="shrink-0 font-medium">{brl(Number(c.valor ?? 0))}</span>
                      </li>
                    ))}
                    {(data!.recuperacoes as any[]).map((r) => (
                      <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <span className="truncate">Recebimento · {r.forma}</span>
                        <span className="shrink-0 font-medium text-[var(--rating-trusted)]">{brl(Number(r.valor ?? 0))}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Nenhum lançamento financeiro</Empty>
                )}
              </Block>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImageGalleryModal open={galleryOpen} onOpenChange={setGalleryOpen} images={imagens as any} />
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">{children}</div>;
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
