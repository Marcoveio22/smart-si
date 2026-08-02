import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateOcorrenciaStatus } from "@/lib/api/ocorrencias.functions";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const OCORRENCIA_STATUS = [
  "Nova",
  "Em análise",
  "Comunicado ao Síndico",
  "Comunicado ao RH",
  "Negociação",
  "Cobrança Enviada",
  "Pagamento Recebido",
  "Finalizada",
  "Arquivada",
] as const;

export type OcorrenciaStatus = (typeof OCORRENCIA_STATUS)[number];

const TONE: Record<string, string> = {
  Nova: "bg-[color-mix(in_oklab,var(--destructive)_16%,transparent)] text-destructive",
  "Em análise": "bg-[color-mix(in_oklab,var(--rating-gold)_22%,transparent)] text-foreground",
  "Comunicado ao Síndico": "bg-[color-mix(in_oklab,var(--chart-1)_18%,transparent)] text-foreground",
  "Comunicado ao RH": "bg-[color-mix(in_oklab,var(--chart-1)_18%,transparent)] text-foreground",
  Negociação: "bg-[color-mix(in_oklab,var(--rating-gold)_22%,transparent)] text-foreground",
  "Cobrança Enviada": "bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-foreground",
  "Pagamento Recebido": "bg-[color-mix(in_oklab,var(--rating-trusted)_18%,transparent)] text-[var(--rating-trusted)]",
  Finalizada: "bg-[color-mix(in_oklab,var(--rating-trusted)_18%,transparent)] text-[var(--rating-trusted)]",
  Arquivada: "bg-muted text-muted-foreground",
};

export function OccurrenceStatusBadge({ status, className = "" }: { status?: string | null; className?: string }) {
  const s = status ?? "Nova";
  return (
    <Badge variant="outline" className={`border-transparent text-[10px] ${TONE[s] ?? TONE.Nova} ${className}`}>
      {s}
    </Badge>
  );
}

/** Select de status com persistência (histórico gravado por trigger no banco). */
export function OccurrenceStatusSelect({
  id,
  status,
  onChanged,
}: {
  id: string;
  status?: string | null;
  onChanged?: (s: OcorrenciaStatus) => void;
}) {
  const queryClient = useQueryClient();
  const update = useServerFn(updateOcorrenciaStatus);

  const mutation = useMutation({
    mutationFn: (novo: OcorrenciaStatus) => update({ data: { id, status: novo } }),
    onSuccess: (_d, novo) => {
      toast.success(`Status atualizado para "${novo}"`);
      onChanged?.(novo);
      queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível atualizar o status"),
  });

  return (
    <div className="flex items-center gap-2">
      <Select value={status ?? "Nova"} onValueChange={(v) => mutation.mutate(v as OcorrenciaStatus)} disabled={mutation.isPending}>
        <SelectTrigger className="h-8 w-full min-w-0 text-xs sm:w-[220px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {OCORRENCIA_STATUS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mutation.isPending && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
    </div>
  );
}
