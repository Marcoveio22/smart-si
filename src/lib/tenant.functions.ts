import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Loja = {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  ativo: boolean;
};

export type TenantContext = {
  userId: string;
  email: string | null;
  nome: string | null;
  isAdmin: boolean;
  lojaId: string | null;
  lojaAtual: Loja | null;
  lojas: Loja[];
};

export const getTenantContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roles }, { data: lojas }] = await Promise.all([
      supabase.from("profiles").select("email, nome, loja_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("lojas").select("id, nome, razao_social, cnpj, ativo").order("nome"),
    ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const lojaId = profile?.loja_id ?? null;
    const lojaAtual = (lojas ?? []).find((l) => l.id === lojaId) ?? null;

    const ctx: TenantContext = {
      userId,
      email: profile?.email ?? null,
      nome: profile?.nome ?? null,
      isAdmin,
      lojaId,
      lojaAtual,
      lojas: (lojas ?? []) as Loja[],
    };
    return ctx;
  });

// First-run bootstrap: promote current signed-in user to admin if no admin exists yet.
export const bootstrapAdminSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("bootstrap_admin_self");
    if (error) throw error;
    return { promoted: !!data };
  });

// Admin: update a user's loja
export const adminSetUserLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), lojaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Apenas administradores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ loja_id: data.lojaId }).eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

// Stats for the "Configurações > Loja" page (respects RLS unless admin passes explicit lojaId).
export const getLojaStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lojaId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdminRpc } = await supabase.rpc("is_admin");
    const isAdmin = !!isAdminRpc;

    let targetLoja = data.lojaId ?? null;
    if (!targetLoja) {
      const { data: profile } = await supabase.from("profiles").select("loja_id").eq("id", userId).maybeSingle();
      targetLoja = profile?.loja_id ?? null;
    }
    if (!targetLoja) return null;

    const loja = (await supabase.from("lojas").select("*").eq("id", targetLoja).maybeSingle()).data;

    const scope = <T extends { eq: any }>(q: T) => (isAdmin ? (q as any).eq("loja_id", targetLoja) : q);

    const [clientes, transacoes, alertas, procs, ultimo] = await Promise.all([
      scope(supabase.from("clientes").select("*", { count: "exact", head: true })),
      scope(supabase.from("transacoes").select("*", { count: "exact", head: true })),
      scope(supabase.from("alertas").select("*", { count: "exact", head: true }).eq("status", "ativo")),
      scope(supabase.from("processamentos").select("*", { count: "exact", head: true })),
      scope(supabase.from("processamentos").select("created_at, status").order("created_at", { ascending: false }).limit(1)),
    ]);

    return {
      loja,
      clientes: clientes.count ?? 0,
      transacoes: transacoes.count ?? 0,
      alertas: alertas.count ?? 0,
      processamentos: procs.count ?? 0,
      ultimoProcessamento: (ultimo.data as any)?.[0] ?? null,
    };
  });
