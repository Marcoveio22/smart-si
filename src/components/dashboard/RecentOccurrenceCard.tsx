import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";

export type RecentOccurrence = {
  id: string;
  descricao: string;
  status: string;
  loja: string;
  horario: string;
  statusTone?: "critico" | "atencao" | "ok";
};

const TONE: Record<string, string> = {
  critico: "bg-[color-mix(in_oklab,var(--destructive)_16%,transparent)] text-destructive border-transparent",
  atencao: "bg-[color-mix(in_oklab,var(--rating-gold)_22%,transparent)] text-foreground border-transparent",
  ok: "bg-[color-mix(in_oklab,var(--rating-trusted)_18%,transparent)] text-[var(--rating-trusted)] border-transparent",
};

export function RecentOccurrenceCard({ item }: { item: RecentOccurrence }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition-all duration-200 hover:shadow-sm hover:border-border">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${TONE[item.statusTone ?? "atencao"]}`}>{item.status}</Badge>
          <span className="text-[11px] text-muted-foreground shrink-0">{item.horario}</span>
        </div>
        <div className="truncate text-sm font-medium">{item.descricao}</div>
        <div className="truncate text-[11px] text-muted-foreground">{item.loja}</div>
      </div>
    </div>
  );
}
