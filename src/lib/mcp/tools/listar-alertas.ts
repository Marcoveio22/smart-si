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
  name: "listar_alertas",
  title: "Listar alertas",
  description: "Lista alertas operacionais gerados pela engine HonestGuard, com gravidade e tipo.",
  inputSchema: {
    gravidade: z.enum(["baixa", "media", "alta"]).optional(),
    tipo: z.string().optional(),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ gravidade, tipo, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    let q = supabaseForUser(ctx).from("alertas")
      .select("id, tipo, gravidade, descricao, created_at, cliente_id")
      .order("created_at", { ascending: false }).limit(limit);
    if (gravidade) q = q.eq("gravidade", gravidade);
    if (tipo) q = q.eq("tipo", tipo);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { alertas: data ?? [] } };
  },
});
