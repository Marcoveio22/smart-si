import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFilters } from "./filters";
import {
  dashboardClientes,
  dashboardExecutivo,
  dashboardFinanceiro,
  dashboardHorarios,
  dashboardProdutos,
  dashboardRecorrentes,
} from "./dashboard.service";

/** GET /dashboard/executivo */
export const getDashboardExecutivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseFilters)
  .handler(({ data, context }) => dashboardExecutivo(context.supabase, data));

/** GET /dashboard/financeiro */
export const getDashboardFinanceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseFilters)
  .handler(({ data, context }) => dashboardFinanceiro(context.supabase, data));

/** GET /dashboard/produtos */
export const getDashboardProdutos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseFilters)
  .handler(({ data, context }) => dashboardProdutos(context.supabase, data));

/** GET /dashboard/clientes */
export const getDashboardClientes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseFilters)
  .handler(({ data, context }) => dashboardClientes(context.supabase, data));

/** GET /dashboard/recorrentes */
export const getClientesRecorrentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseFilters)
  .handler(({ data, context }) => dashboardRecorrentes(context.supabase, data));

/** GET /dashboard/horarios */
export const getDashboardHorarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseFilters)
  .handler(({ data, context }) => dashboardHorarios(context.supabase, data));
