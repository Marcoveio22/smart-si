import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type MetricCardProps = {
  icon: any;
  label: string;
  value: string | number;
  /** Variação percentual. null = ainda sem dado (placeholder visual). */
  delta?: number | null;
  /** Série do sparkline. Vazia = placeholder visual. */
  series?: number[];
  accent?: string;
  hint?: string;
};

export function MetricCard({ icon: Icon, label, value, delta = null, series = [], accent, hint }: MetricCardProps) {
  const color = accent ?? "var(--primary)";
  const data = series.map((v, i) => ({ i, v }));
  const gradId = `spark-${label.replace(/\W+/g, "")}`;
  const trend = delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="border-border/70 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
            style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="mt-0.5 truncate text-2xl font-extrabold tracking-tight">{value}</div>
          </div>
        </div>


        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              trend === "up" && "bg-[color-mix(in_oklab,var(--rating-trusted)_18%,transparent)] text-[var(--rating-trusted)]",
              trend === "down" && "bg-[color-mix(in_oklab,var(--destructive)_16%,transparent)] text-destructive",
              trend === "flat" && "bg-muted text-muted-foreground",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">{hint ?? "vs. período anterior"}</span>
        </div>

        <div className="h-10 -mx-1">
          {data.length > 1 ? (
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-md bg-muted/60" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
