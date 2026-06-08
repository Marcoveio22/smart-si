import { cn } from "@/lib/utils";

const styles: Record<string, { cls: string; icon: string; label: string }> = {
  TRUSTED: { cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: "🟢", label: "TRUSTED" },
  NEUTRO: { cls: "bg-muted text-muted-foreground border-border", icon: "⚪", label: "NEUTRO" },
  RED_FLAG: { cls: "bg-red-500/15 text-red-500 border-red-500/30", icon: "🔴", label: "RED FLAG" },
};

export function StatusManualBadge({ status }: { status?: string | null }) {
  const s = styles[(status ?? "NEUTRO").toUpperCase()] ?? styles.NEUTRO;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide", s.cls)}>
      <span>{s.icon}</span>
      <span>{s.label}</span>
    </span>
  );
}
