import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type NayaxStatus = {
  configurado: boolean;
  status: string | null;
  ultimaSincronizacao: string | null;
  ultimoErro: string | null;
  atualizadoEm: string | null;
};

const lojaInput = z.object({ lojaId: z.string().uuid() });

// Admin da loja específica: precisa ser admin E ter vínculo em user_lojas com a loja.
async function assertAdminDaLoja(supabase: any, lojaId: string) {
  const [{ data: isAdmin }, { data: hasLoja }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("user_has_loja", { _user_id: undefined, _loja_id: lojaId }),
  ]);
  if (!isAdmin) throw new Error("Apenas administradores");
  if (!hasLoja) throw new Error("Você não tem vínculo com esta loja");
}

// NUNCA retorna o token (write-only). Apenas metadados de status.
export const getNayaxStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => lojaInput.parse(d))
  .handler(async ({ data, context }): Promise<NayaxStatus> => {
    await assertAdminDaLojaFor(context, data.lojaId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("loja_nayax_credentials")
      .select("status, ultima_sincronizacao, ultimo_erro, updated_at")
      .eq("loja_id", data.lojaId)
      .maybeSingle();
    if (error) throw error;
    return {
      configurado: !!row,
      status: row?.status ?? null,
      ultimaSincronizacao: row?.ultima_sincronizacao ?? null,
      ultimoErro: row?.ultimo_erro ?? null,
      atualizadoEm: row?.updated_at ?? null,
    };
  });

export const setNayaxToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ lojaId: z.string().uuid(), token: z.string().trim().min(10).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminDaLojaFor(context, data.lojaId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("loja_nayax_credentials")
      .upsert(
        {
          loja_id: data.lojaId,
          access_token: data.token,
          status: "ativo",
          ultimo_erro: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "loja_id" },
      );
    if (error) throw error;
    return { ok: true as const };
  });

async function assertAdminDaLojaFor(context: { supabase: any; userId: string }, lojaId: string) {
  const [{ data: isAdmin }, { data: hasLoja }] = await Promise.all([
    context.supabase.rpc("is_admin"),
    context.supabase.rpc("user_has_loja", { _user_id: context.userId, _loja_id: lojaId }),
  ]);
  if (!isAdmin) throw new Error("Apenas administradores");
  if (!hasLoja) throw new Error("Você não tem vínculo com esta loja");
}
