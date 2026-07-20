import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "listar_clientes",
  title: "Listar clientes",
  description: "Lista clientes monitorados com rating, status manual, gasto e ocorrências. Filtre por rating (DIAMOND, GOLD, SILVER, RED) ou status manual (TRUSTED, NEUTRO, RED_FLAG).",
  inputSchema: {
    rating: z.enum(["DIAMOND", "GOLD", "SILVER", "RED"]).optional(),
    status_manual: z.enum(["TRUSTED", "NEUTRO", "RED_FLAG"]).optional(),
    numero_cartao: z.string().optional().describe("Busca parcial por número de cartão"),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ rating, status_manual, numero_cartao, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    let q = supabaseForUser(ctx).from("clientes")
      .select("numero_cartao, rating_final, status_manual, score_confianca, is_trusted, total_gasto, total_compras, ocorrencias, ultima_compra")
      .order("total_gasto", { ascending: false }).limit(limit);
    if (rating) q = q.eq("rating_final", rating);
    if (status_manual) q = q.eq("status_manual", status_manual);
    if (numero_cartao) q = q.ilike("numero_cartao", `%${numero_cartao}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { clientes: data ?? [] } };
  },
});
