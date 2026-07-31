import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickAction = {
  icon: any;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
};

export function QuickActionCard({ action }: { action: QuickAction }) {
  const { icon: Icon, label, onClick, disabled, hint } = action;
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={cn(
        "h-auto w-full justify-start gap-3 py-3 px-3 text-left transition-all duration-200",
        "hover:bg-accent/10 hover:border-accent/40",
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {hint && <span className="block truncate text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </span>
    </Button>
  );
}
