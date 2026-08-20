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

// NUNCA retorna o token (write-only). Apenas metadados de status.
export const getNayaxStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lojaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<NayaxStatus> => {
    const { assertAdminDaLoja } = await import("@/lib/nayax-guard.server");
    await assertAdminDaLoja(context, data.lojaId);
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
    const { assertAdminDaLoja } = await import("@/lib/nayax-guard.server");
    await assertAdminDaLoja(context, data.lojaId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("loja_nayax_credentials").upsert(
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
