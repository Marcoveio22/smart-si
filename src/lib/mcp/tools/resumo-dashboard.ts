import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "resumo_dashboard",
  title: "Resumo do dashboard",
  description: "Retorna contagens por rating, status manual, totais de clientes, alertas e último processamento.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const sb = supabaseForUser(ctx);
    const [clientes, alertas, ultimoProc] = await Promise.all([
      sb.from("clientes").select("rating_final, status_manual, is_trusted, total_gasto"),
      sb.from("alertas").select("gravidade", { count: "exact", head: true }),
      sb.from("processamentos").select("id, created_at, total_transacoes, faturamento_total, clientes_red, clientes_trusted, status").eq("status", "concluido").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const cs = clientes.data ?? [];
    const porRating = cs.reduce<Record<string, number>>((a, c) => (a[c.rating_final] = (a[c.rating_final] ?? 0) + 1, a), {});
    const porStatus = cs.reduce<Record<string, number>>((a, c) => (a[c.status_manual ?? "NEUTRO"] = (a[c.status_manual ?? "NEUTRO"] ?? 0) + 1, a), {});
    const faturamentoTotal = cs.reduce((s, c) => s + Number(c.total_gasto ?? 0), 0);
    const resumo = {
      total_clientes: cs.length,
      por_rating: porRating,
      por_status_manual: porStatus,
      trusted: cs.filter((c) => c.is_trusted).length,
      faturamento_total: faturamentoTotal,
      total_alertas: alertas.count ?? 0,
      ultimo_processamento: ultimoProc.data ?? null,
    };
    return { content: [{ type: "text", text: JSON.stringify(resumo) }], structuredContent: resumo };
  },
});
