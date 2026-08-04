import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickAction = {
  icon: any;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
  /** Cor de destaque (token CSS). Ex.: "var(--rating-trusted)" */
  accent?: string;
};

export function QuickActionCard({ action }: { action: QuickAction }) {
  const { icon: Icon, label, onClick, disabled, hint, accent } = action;
  const color = accent ?? "var(--primary)";

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={cn(
        "h-auto w-full justify-start gap-3 rounded-xl py-3 px-3 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-sm",
      )}
      style={{
        background: `color-mix(in oklab, ${color} 7%, transparent)`,
        borderColor: `color-mix(in oklab, ${color} 28%, transparent)`,
      }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold" style={{ color }}>
          {label}
        </span>
        {hint && <span className="block truncate text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </span>
    </Button>
  );
}
