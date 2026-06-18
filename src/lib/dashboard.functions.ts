import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const ratings = ["DIAMOND", "GOLD", "SILVER", "RED", "TRUSTED"] as const;
    const statuses = ["TRUSTED", "NEUTRO", "RED_FLAG"] as const;

    const ratingCountsP = Promise.all(
      ratings.map((r) =>
        supabase.from("clientes").select("*", { count: "exact", head: true }).eq("rating_final", r),
      ),
    );
    const statusCountsP = Promise.all(
      statuses.map((s) =>
        s === "NEUTRO"
          ? supabase.from("clientes").select("*", { count: "exact", head: true }).or("status_manual.is.null,status_manual.eq.NEUTRO")
          : supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status_manual", s),
      ),
    );
    const totalClientesP = supabase.from("clientes").select("*", { count: "exact", head: true });
    const alertasAtivosP = supabase.from("alertas").select("id, created_at, gravidade").eq("status", "ativo");
    const top10P = supabase.from("clientes")
      .select("numero_cartao, rating_final, status_manual, total_compras, total_gasto")
      .order("total_gasto", { ascending: false }).limit(10);

    // Aggregate transactions in pages (Supabase caps at 1000 per request)
    let from = 0; const page = 1000;
    let faturamentoTotal = 0;
    const fatPorMes = new Map<string, number>();
    while (true) {
      const { data, error } = await supabase
        .from("transacoes").select("valor, data_transacao").range(from, from + page - 1);
      if (error) throw error;
      if (!data?.length) break;
      for (const t of data) {
        const v = Number(t.valor) || 0;
        faturamentoTotal += v;
        const d = new Date(t.data_transacao);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        fatPorMes.set(k, (fatPorMes.get(k) ?? 0) + v);
      }
      if (data.length < page) break;
      from += page;
    }

    const [ratingCounts, statusCounts, totalClientes, alertas, top10] =
      await Promise.all([ratingCountsP, statusCountsP, totalClientesP, alertasAtivosP, top10P]);

    const byRating: Record<string, number> = {};
    ratings.forEach((r, i) => { byRating[r] = ratingCounts[i].count ?? 0; });
    const byStatusManual: Record<string, number> = {};
    statuses.forEach((s, i) => { byStatusManual[s] = statusCounts[i].count ?? 0; });

    const alertasPorDia = new Map<string, number>();
    (alertas.data ?? []).forEach((a) => {
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
