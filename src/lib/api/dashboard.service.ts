import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { applyCommonFilters, pageRange, type DashboardFilters } from "./filters";

type DB = SupabaseClient<Database>;

const unwrap = <T>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
};

/** GET /dashboard/executivo — KPIs agregados no banco (view dashboard_executivo). */
export async function dashboardExecutivo(supabase: DB, f: DashboardFilters) {
  let q = supabase.from("dashboard_executivo").select("*").order("dia", { ascending: true });
  q = applyCommonFilters(q, f, { dateColumn: "dia" });
  const rows = unwrap(await q);

  const totals = rows.reduce(
    (acc, r: any) => {
      acc.totalOcorrencias += r.total_ocorrencias ?? 0;
      acc.ocorrenciasAbertas += r.ocorrencias_abertas ?? 0;
      acc.ocorrenciasFinalizadas += r.ocorrencias_finalizadas ?? 0;
      acc.valorPerdido += Number(r.valor_perdido ?? 0);
      acc.valorRecuperado += Number(r.valor_recuperado ?? 0);
      return acc;
    },
    { totalOcorrencias: 0, ocorrenciasAbertas: 0, ocorrenciasFinalizadas: 0, valorPerdido: 0, valorRecuperado: 0 },
  );

  const { data: faturamento, error: fatErr } = await supabase.rpc("faturamento_total", {
    _loja_id: f.lojaId ?? undefined,
    _from: f.from ?? undefined,
    _to: f.to ?? undefined,
  });
  if (fatErr) throw new Error(fatErr.message);

  const taxaRecuperacao = totals.valorPerdido > 0 ? totals.valorRecuperado / totals.valorPerdido : 0;

  return {
    ...totals,
    faturamentoTotal: Number(faturamento ?? 0),
    taxaRecuperacao,
    serie: rows.map((r: any) => ({
      dia: r.dia,
      total: r.total_ocorrencias ?? 0,
      valorPerdido: Number(r.valor_perdido ?? 0),
      valorRecuperado: Number(r.valor_recuperado ?? 0),
    })),
  };
}

/** GET /dashboard/financeiro */
export async function dashboardFinanceiro(supabase: DB, f: DashboardFilters) {
  const { fromIdx, toIdx } = pageRange(f);
  let q = supabase
    .from("dashboard_financeiro")
    .select("*", { count: "exact" })
    .order("data_ocorrencia", { ascending: false })
    .range(fromIdx, toIdx);
  q = applyCommonFilters(q, f);
  const res = await q;
  if (res.error) throw new Error(res.error.message);

  const { data: porMes, error } = await supabase.rpc("faturamento_por_mes", {
    _loja_id: f.lojaId ?? undefined,
    _from: f.from ?? undefined,
    _to: f.to ?? undefined,
  });
  if (error) throw new Error(error.message);

  return { rows: res.data ?? [], total: res.count ?? 0, faturamentoPorMes: porMes ?? [] };
}

/** GET /dashboard/produtos — ranking de produtos envolvidos. */
export async function dashboardProdutos(supabase: DB, f: DashboardFilters) {
  let q = supabase.from("dashboard_produtos").select("*").limit(2000);
  q = applyCommonFilters(q, f);
  const rows = unwrap(await q);

  const map = new Map<string, { produto: string; categoria: string | null; quantidade: number; valor: number; ocorrencias: number }>();
  for (const r of rows as any[]) {
    const key = r.produto_nome ?? "Não informado";
    const cur = map.get(key) ?? { produto: key, categoria: r.categoria ?? null, quantidade: 0, valor: 0, ocorrencias: 0 };
    cur.quantidade += Number(r.quantidade ?? 0);
    cur.valor += Number(r.valor_total ?? 0);
    cur.ocorrencias += 1;
    map.set(key, cur);
  }
  return { ranking: [...map.values()].sort((a, b) => b.valor - a.valor) };
}

/** GET /dashboard/clientes */
export async function dashboardClientes(supabase: DB, f: DashboardFilters) {
  const { fromIdx, toIdx } = pageRange(f);
  let q = supabase
    .from("dashboard_clientes")
    .select("*", { count: "exact" })
    .order("valor_perdido", { ascending: false, nullsFirst: false })
    .range(fromIdx, toIdx);
  if (f.lojaId) q = q.eq("loja_id", f.lojaId);
  if (f.clienteId) q = q.eq("cliente_id", f.clienteId);
  if (f.numeroCartao) q = q.ilike("numero_cartao", `%${f.numeroCartao}%`);
  const res = await q;
  if (res.error) throw new Error(res.error.message);
  return { rows: res.data ?? [], total: res.count ?? 0 };
}

/** GET /dashboard/recorrentes */
export async function dashboardRecorrentes(supabase: DB, f: DashboardFilters) {
  const { fromIdx, toIdx } = pageRange(f);
  let q = supabase
    .from("vw_clientes_recorrentes")
    .select("*", { count: "exact" })
    .gt("total_ocorrencias", 1)
    .order("total_ocorrencias", { ascending: false })
    .range(fromIdx, toIdx);
  if (f.lojaId) q = q.eq("loja_id", f.lojaId);
  if (f.clienteId) q = q.eq("cliente_id", f.clienteId);
  const res = await q;
  if (res.error) throw new Error(res.error.message);
  return { rows: res.data ?? [], total: res.count ?? 0 };
}

/** GET /dashboard/horarios — mapa de calor dia da semana x hora. */
export async function dashboardHorarios(supabase: DB, f: DashboardFilters) {
  const { data, error } = await supabase.rpc("dashboard_horarios", {
    _loja_id: f.lojaId ?? undefined,
    _from: f.from ?? undefined,
    _to: f.to ?? undefined,
  });
  if (error) throw new Error(error.message);
  return { celulas: (data ?? []).map((r: any) => ({ diaSemana: r.dia_semana, hora: r.hora, total: Number(r.total ?? 0), valor: Number(r.valor ?? 0) })) };
}
