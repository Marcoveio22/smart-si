import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
