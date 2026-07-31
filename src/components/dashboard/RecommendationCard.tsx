import { Badge } from "@/components/ui/badge";

export type Recommendation = {
  id: string;
  titulo: string;
  detalhe: string;
  prioridade: "alta" | "media" | "baixa";
  icon: any;
};

const PRIORIDADE_STYLE: Record<Recommendation["prioridade"], { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-[color-mix(in_oklab,var(--destructive)_16%,transparent)] text-destructive border-transparent" },
  media: { label: "Média", className: "bg-[color-mix(in_oklab,var(--rating-gold)_22%,transparent)] text-foreground border-transparent" },
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground border-transparent" },
};

export function RecommendationCard({ item }: { item: Recommendation }) {
  const { icon: Icon } = item;
  const p = PRIORIDADE_STYLE[item.prioridade];
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border/60 bg-card p-3 transition-all duration-200 hover:shadow-sm hover:border-border">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/12 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{item.titulo}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{item.detalhe}</div>
      </div>
      <Badge variant="outline" className={`shrink-0 text-[10px] ${p.className}`}>{p.label}</Badge>
    </div>
  );
}
