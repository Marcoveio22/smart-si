import { z } from "zod";

/**
 * Filtros canônicos de leitura do Smart SI.
 * Toda API de dashboard/ocorrências usa este contrato — não crie variantes.
 */
export const dashboardFiltersSchema = z.object({
  lojaId: z.string().uuid().nullish(),
  from: z.string().datetime().nullish(),
  to: z.string().datetime().nullish(),
  clienteId: z.string().uuid().nullish(),
  produtoId: z.string().uuid().nullish(),
  status: z.string().nullish(),
  operador: z.string().uuid().nullish(),
  tipoOcorrencia: z.string().nullish(),
  numeroCartao: z.string().nullish(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(200).default(50),
});

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;

export const parseFilters = (d: unknown): DashboardFilters =>
  dashboardFiltersSchema.parse(d ?? {});

export type Range = { fromIdx: number; toIdx: number };

export const pageRange = (f: DashboardFilters): Range => ({
  fromIdx: f.page * f.pageSize,
  toIdx: f.page * f.pageSize + f.pageSize - 1,
});

/**
 * Aplica os filtros comuns a uma query PostgREST sobre uma view/tabela
 * que exponha as colunas loja_id / data_ocorrencia / cliente_id / status / etc.
 */
export function applyCommonFilters<T>(query: T, f: DashboardFilters, opts?: { dateColumn?: string }): T {
  const dateCol = opts?.dateColumn ?? "data_ocorrencia";
  let q = query as any;
  if (f.lojaId) q = q.eq("loja_id", f.lojaId);
  if (f.from) q = q.gte(dateCol, f.from);
  if (f.to) q = q.lte(dateCol, f.to);
  if (f.clienteId) q = q.eq("cliente_id", f.clienteId);
  if (f.status) q = q.eq("status", f.status);
  if (f.tipoOcorrencia) q = q.eq("tipo_ocorrencia", f.tipoOcorrencia);
  if (f.operador) q = q.eq("status_usuario", f.operador);
  if (f.produtoId) q = q.eq("produto_id", f.produtoId);
  if (f.numeroCartao) q = q.ilike("numero_cartao", `%${f.numeroCartao}%`);
  return q as T;
}
