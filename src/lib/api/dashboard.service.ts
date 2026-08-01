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

/**
 * GET /dashboard/financeiro/resumo — KPIs de cobrança e recuperação.
 * Agregado sobre cobrancas + recuperacoes + ocorrencias, sempre no escopo do tenant (RLS).
 */
export async function financeiroResumo(supabase: DB, f: DashboardFilters) {
  const scope = <T>(q: T, dateCol: string): T => {
    let x = q as any;
    if (f.lojaId) x = x.eq("loja_id", f.lojaId);
    if (f.from) x = x.gte(dateCol, f.from);
    if (f.to) x = x.lte(dateCol, f.to);
    if (f.clienteId) x = x.eq("cliente_id", f.clienteId);
    return x as T;
  };

  const [cob, rec, oco] = await Promise.all([
    scope(supabase.from("cobrancas").select("status, valor, created_at, loja_id, cliente_id").limit(5000), "created_at"),
    scope(supabase.from("recuperacoes").select("valor, forma, data, loja_id").limit(5000), "data"),
    scope(
      supabase
        .from("ocorrencias")
        .select("valor_perdido, valor_recuperado, status, data_ocorrencia, loja_id, cliente_id")
        .limit(5000),
      "data_ocorrencia",
    ),
  ]);
  const err = cob.error ?? rec.error ?? oco.error;
  if (err) throw new Error(err.message);

  const cobrancas = (cob.data ?? []) as any[];
  const recuperacoes = (rec.data ?? []) as any[];
  const ocorrencias = (oco.data ?? []) as any[];

  const bucket = (statuses: string[]) =>
    cobrancas
      .filter((c) => statuses.includes(c.status))
      .reduce((a, c) => ({ qtd: a.qtd + 1, valor: a.valor + Number(c.valor ?? 0) }), { qtd: 0, valor: 0 });

  const pendentes = bucket(["Pendente"]);
  const enviadas = bucket(["Enviada", "Negociada"]);
  const pagas = bucket(["Paga"]);

  const recebimentos = recuperacoes.reduce((a, r) => a + Number(r.valor ?? 0), 0);
  const valorRecuperado = ocorrencias.reduce((a, o) => a + Number(o.valor_recuperado ?? 0), 0) || recebimentos;
  const valorPerdido = ocorrencias.reduce((a, o) => a + Number(o.valor_perdido ?? 0), 0);
  const taxaRecuperacao = valorPerdido > 0 ? valorRecuperado / valorPerdido : 0;

  const porForma = new Map<string, number>();
  for (const r of recuperacoes) porForma.set(r.forma ?? "Outro", (porForma.get(r.forma ?? "Outro") ?? 0) + Number(r.valor ?? 0));

  return {
    cobrancasPendentes: pendentes,
    cobrancasEnviadas: enviadas,
    cobrancasPagas: pagas,
    recebimentos,
    qtdRecebimentos: recuperacoes.length,
    valorPerdido,
    valorRecuperado,
    taxaRecuperacao,
    porForma: [...porForma.entries()].map(([forma, valor]) => ({ forma, valor })).sort((a, b) => b.valor - a.valor),
  };
}

/** GET /dashboard/produtos — ranking de produtos furtados com perda/recuperação. */
export async function dashboardProdutos(supabase: DB, f: DashboardFilters) {
  let q = supabase.from("dashboard_produtos").select("*").limit(5000);
  q = applyCommonFilters(q, f);
  const rows = unwrap(await q) as any[];

  // Rateio da recuperação da ocorrência entre seus produtos (proporcional ao valor).
  const ocorrenciaIds = [...new Set(rows.map((r) => r.ocorrencia_id).filter(Boolean))];
  const recuperadoPorOcorrencia = new Map<string, number>();
  if (ocorrenciaIds.length) {
    const { data, error } = await supabase
      .from("ocorrencias")
      .select("id, valor_recuperado")
      .in("id", ocorrenciaIds.slice(0, 1000));
    if (error) throw new Error(error.message);
    for (const o of data ?? []) recuperadoPorOcorrencia.set(o.id, Number(o.valor_recuperado ?? 0));
  }
  const totalPorOcorrencia = new Map<string, number>();
  for (const r of rows) {
    totalPorOcorrencia.set(r.ocorrencia_id, (totalPorOcorrencia.get(r.ocorrencia_id) ?? 0) + Number(r.valor_total ?? 0));
  }

  type Item = {
    produto: string;
    categoria: string | null;
    quantidade: number;
    valorPerdido: number;
    valorRecuperado: number;
    ocorrencias: number;
  };
  const map = new Map<string, Item>();
  for (const r of rows) {
    const key = r.produto_nome ?? "Não informado";
    const cur =
      map.get(key) ?? { produto: key, categoria: r.categoria ?? null, quantidade: 0, valorPerdido: 0, valorRecuperado: 0, ocorrencias: 0 };
    const valor = Number(r.valor_total ?? 0);
    const totalOc = totalPorOcorrencia.get(r.ocorrencia_id) ?? 0;
    const recOc = recuperadoPorOcorrencia.get(r.ocorrencia_id) ?? 0;
    cur.quantidade += Number(r.quantidade ?? 0);
    cur.valorPerdido += valor;
    cur.valorRecuperado += totalOc > 0 ? (valor / totalOc) * recOc : 0;
    cur.ocorrencias += 1;
    map.set(key, cur);
  }

  const ranking = [...map.values()].sort((a, b) => b.quantidade - a.quantidade || b.valorPerdido - a.valorPerdido);
  const totalQtd = ranking.reduce((a, r) => a + r.quantidade, 0);
  return {
    ranking: ranking.map((r) => ({ ...r, percentual: totalQtd > 0 ? r.quantidade / totalQtd : 0 })),
    totalQuantidade: totalQtd,
  };
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
