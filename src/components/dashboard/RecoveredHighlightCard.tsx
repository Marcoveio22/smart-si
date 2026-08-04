import { Trophy, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function RecoveredHighlightCard({
  nome,
  valorRecuperado,
  taxaRecuperacao,
  periodoLabel,
  isLoading,
}: {
  nome: string;
  valorRecuperado?: number;
  taxaRecuperacao?: number;
  periodoLabel: string;
  isLoading?: boolean;
}) {
  const pct = Math.round((taxaRecuperacao ?? 0) * 100);

  return (
    <Card className="overflow-hidden border-border/70 p-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-2 border-b border-[color-mix(in_oklab,var(--rating-trusted)_25%,transparent)] bg-[color-mix(in_oklab,var(--rating-trusted)_12%,transparent)] px-4 py-3">
        <Trophy className="h-4 w-4 shrink-0 text-[var(--rating-trusted)]" />
        <h3 className="truncate text-sm font-bold uppercase tracking-wide text-[var(--rating-trusted)]">
          Valores Recuperados
        </h3>
      </div>

      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5 text-base font-bold text-[var(--rating-trusted)]">
                  <span className="truncate capitalize">Parabéns, {nome}!</span>
                  <PartyPopper className="h-4 w-4 shrink-0" />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Você recuperou</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight">{brl(valorRecuperado ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{periodoLabel}</p>
              </div>
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--rating-gold)_18%,transparent)] text-[var(--rating-gold)]">
                <Trophy className="h-8 w-8" />
              </div>
            </div>

            <div className="rounded-xl border border-[color-mix(in_oklab,var(--rating-trusted)_25%,transparent)] bg-[color-mix(in_oklab,var(--rating-trusted)_8%,transparent)] p-3 text-xs leading-relaxed text-muted-foreground">
              Esse valor representa <strong className="text-foreground">{pct}%</strong> das perdas identificadas no
              período. Sua atuação evita perdas, aumenta o lucro e reduz a recorrência de furtos!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
