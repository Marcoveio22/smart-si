import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardCard({
  title,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  icon?: any;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card
      className={cn(
        "border-border/70 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border",
        className,
      )}
    >
      {title && (
        <CardHeader className="pb-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
              <span className="truncate">{title}</span>
            </CardTitle>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("pt-2", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
