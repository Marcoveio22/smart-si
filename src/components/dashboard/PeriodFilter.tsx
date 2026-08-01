import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/periods";
import { cn } from "@/lib/utils";

export function PeriodFilter({
  value,
  onChange,
  size = "md",
}: {
  value: PeriodKey;
  onChange: (k: PeriodKey) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-card p-1">
      {PERIOD_OPTIONS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={cn(
            "rounded-md px-2 py-1 font-medium transition-colors",
            size === "sm" ? "text-[11px]" : "text-xs",
            value === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
          title={p.label}
        >
          {p.short}
        </button>
      ))}
    </div>
  );
}
