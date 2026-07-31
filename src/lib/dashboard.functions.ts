import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lojaId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Always honor an explicit lojaId; admin without one sees "all" via RLS.
    const lojaFilter: string | null = data.lojaId ?? null;
    const scope = <T extends { eq: any }>(q: T) => (lojaFilter ? (q as any).eq("loja_id", lojaFilter) : q);

    const ratings = ["DIAMOND", "GOLD", "SILVER", "RED", "TRUSTED"] as const;
    const statuses = ["TRUSTED", "NEUTRO", "RED_FLAG"] as const;

    const ratingCountsP = Promise.all(
      ratings.map((r) => scope(supabase.from("clientes").select("*", { count: "exact", head: true }).eq("rating_final", r))),
    );
    const statusCountsP = Promise.all(
      statuses.map((s) =>
        s === "NEUTRO"
          ? scope(supabase.from("clientes").select("*", { count: "exact", head: true }).or("status_manual.is.null,status_manual.eq.NEUTRO"))
          : scope(supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status_manual", s)),
      ),
    );
    const totalClientesP = scope(supabase.from("clientes").select("*", { count: "exact", head: true }));
    const alertasAtivosP = scope(supabase.from("alertas").select("id, created_at, gravidade").eq("status", "ativo"));
    const top10P = scope(
      supabase.from("clientes")
        .select("numero_cartao, rating_final, status_manual, total_compras, total_gasto")
        .order("total_gasto", { ascending: false }).limit(10),
    );

    // Faturamento agregado no banco (sem paginar transações na aplicação)
    const [{ data: fatTotal, error: fatErr }, { data: fatMeses, error: mesErr }] = await Promise.all([
      supabase.rpc("faturamento_total", { _loja_id: lojaFilter ?? undefined }),
      supabase.rpc("faturamento_por_mes", { _loja_id: lojaFilter ?? undefined }),
    ]);
    if (fatErr) throw fatErr;
    if (mesErr) throw mesErr;
    const faturamentoTotal = Number(fatTotal ?? 0);
    const fatPorMes = new Map<string, number>(
      (fatMeses ?? []).map((r: any) => [String(r.mes), Number(r.total ?? 0)] as const),
    );

    const [ratingCounts, statusCounts, totalClientes, alertas, top10] =
      await Promise.all([ratingCountsP, statusCountsP, totalClientesP, alertasAtivosP, top10P]);

    const byRating: Record<string, number> = {};
    ratings.forEach((r, i) => { byRating[r] = ratingCounts[i].count ?? 0; });
    const byStatusManual: Record<string, number> = {};
    statuses.forEach((s, i) => { byStatusManual[s] = statusCounts[i].count ?? 0; });

    const alertasPorDia = new Map<string, number>();
    ((alertas.data ?? []) as any[]).forEach((a) => {
      const d = new Date(a.created_at).toISOString().slice(0, 10);
      alertasPorDia.set(d, (alertasPorDia.get(d) ?? 0) + 1);
    });

    return {
      totalClientes: totalClientes.count ?? 0,
      byRating,
      byStatusManual,
      alertasAtivos: alertas.data?.length ?? 0,
      faturamentoTotal,
      fatPorMes: [...fatPorMes.entries()].sort().map(([mes, total]) => ({ mes, total })),
      alertasPorDia: [...alertasPorDia.entries()].sort().map(([dia, total]) => ({ dia: dia.slice(5), total })),
      top10: top10.data ?? [],
    };
  });
