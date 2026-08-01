/** Presets de período usados pelos filtros do Dashboard Executivo. */
export type PeriodKey = "hoje" | "7d" | "30d" | "90d" | "12m" | "tudo";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; short: string }[] = [
  { key: "hoje", label: "Hoje", short: "Hoje" },
  { key: "7d", label: "Últimos 7 dias", short: "7 dias" },
  { key: "30d", label: "Últimos 30 dias", short: "30 dias" },
  { key: "90d", label: "Últimos 90 dias", short: "90 dias" },
  { key: "12m", label: "Últimos 12 meses", short: "12 meses" },
  { key: "tudo", label: "Todo o histórico", short: "Histórico" },
];

export function periodRange(key: PeriodKey): { from: string | null; to: string | null } {
  if (key === "tudo") return { from: null, to: null };
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now);
  if (key === "hoje") from.setHours(0, 0, 0, 0);
  if (key === "7d") from.setDate(from.getDate() - 7);
  if (key === "30d") from.setDate(from.getDate() - 30);
  if (key === "90d") from.setDate(from.getDate() - 90);
  if (key === "12m") from.setMonth(from.getMonth() - 12);
  return { from: from.toISOString(), to };
}

export const periodLabel = (key: PeriodKey) => PERIOD_OPTIONS.find((p) => p.key === key)?.label ?? "Período";
