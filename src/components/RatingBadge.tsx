import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  DIAMOND: "bg-[var(--rating-diamond)]/15 text-[var(--rating-diamond)] border-[var(--rating-diamond)]/30",
  GOLD: "bg-[var(--rating-gold)]/15 text-[var(--rating-gold)] border-[var(--rating-gold)]/30",
  SILVER: "bg-[var(--rating-silver)]/20 text-[var(--rating-silver)] border-[var(--rating-silver)]/30",
  RED: "bg-[var(--rating-red)]/15 text-[var(--rating-red)] border-[var(--rating-red)]/30",
  TRUSTED: "bg-[var(--rating-trusted)]/15 text-[var(--rating-trusted)] border-[var(--rating-trusted)]/30",
};

export function RatingBadge({ rating }: { rating: string }) {
  const cls = styles[rating?.toUpperCase()] ?? styles.SILVER;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide", cls)}>
      {rating?.toUpperCase() ?? "—"}
    </span>
  );
}
