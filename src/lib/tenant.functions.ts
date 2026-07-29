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
  lojaId: string | null;      // default/active loja (profiles.loja_id)
  lojaAtual: Loja | null;     // resolved default loja
  lojas: Loja[];              // lojas the user can access (admin = all; user = user_lojas)
};

export const getTenantContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roles }, { data: allLojas }, { data: myLinks }] = await Promise.all([
      supabase.from("profiles").select("email, nome, loja_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("lojas").select("id, nome, razao_social, cnpj, ativo").order("nome"),
      supabase.from("user_lojas").select("loja_id").eq("user_id", userId),
    ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const lojasAll = (allLojas ?? []) as Loja[];

    let lojas: Loja[];
    if (isAdmin) {
      lojas = lojasAll;
    } else {
      const linkedIds = new Set((myLinks ?? []).map((r) => r.loja_id));
      // Fallback: include profiles.loja_id even if link wasn't backfilled
      if (profile?.loja_id) linkedIds.add(profile.loja_id);
      lojas = lojasAll.filter((l) => linkedIds.has(l.id));
    }

    const lojaId = profile?.loja_id ?? (lojas[0]?.id ?? null);
    const lojaAtual = lojas.find((l) => l.id === lojaId) ?? lojas[0] ?? null;

    const ctx: TenantContext = {
      userId,
      email: profile?.email ?? null,
      nome: profile?.nome ?? null,
      isAdmin,
      lojaId,
      lojaAtual,
      lojas,
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

// Admin: update a user's default loja
export const adminSetUserLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), lojaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Apenas administradores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ loja_id: data.lojaId }).eq("id", data.userId);
    if (error) throw error;
    // Ensure link exists too
    await supabaseAdmin.from("user_lojas").upsert({ user_id: data.userId, loja_id: data.lojaId });
    return { ok: true };
  });

// Admin: list all users with their linked lojas
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Apenas administradores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: links }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, nome, loja_id").order("email"),
      supabaseAdmin.from("user_lojas").select("user_id, loja_id"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const byUser = new Map<string, string[]>();
    (links ?? []).forEach((l) => {
      const arr = byUser.get(l.user_id) ?? [];
      arr.push(l.loja_id);
      byUser.set(l.user_id, arr);
    });
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      nome: p.nome,
      defaultLojaId: p.loja_id,
      lojaIds: byUser.get(p.id) ?? [],
      roles: rolesByUser.get(p.id) ?? [],
    }));
  });

// Admin: replace a user's linked lojas (multi-select)
export const adminSetUserLojas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      lojaIds: z.array(z.string().uuid()),
      defaultLojaId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Apenas administradores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: rpcErr } = await context.supabase.rpc("admin_set_user_lojas", {
      _user_id: data.userId,
      _loja_ids: data.lojaIds,
    });
    if (rpcErr) throw rpcErr;

    // Update default loja on the profile if requested (must be one of the assigned lojas or null)
    const nextDefault =
      data.defaultLojaId && data.lojaIds.includes(data.defaultLojaId)
        ? data.defaultLojaId
        : data.lojaIds[0] ?? null;
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({ loja_id: nextDefault })
      .eq("id", data.userId);
    if (pErr) throw pErr;

    return { ok: true, defaultLojaId: nextDefault };
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

    // Always filter by the target loja explicitly, so multi-loja users see one at a time.
    const scope = <T extends { eq: any }>(q: T) => (q as any).eq("loja_id", targetLoja);

    const [clientes, transacoes, alertas, procs, ultimo] = await Promise.all([
      scope(supabase.from("clientes").select("*", { count: "exact", head: true })),
      scope(supabase.from("transacoes").select("*", { count: "exact", head: true })),
      scope(supabase.from("alertas").select("*", { count: "exact", head: true }).eq("status", "ativo")),
      scope(supabase.from("processamentos").select("*", { count: "exact", head: true })),
      scope(supabase.from("processamentos").select("created_at, status").order("created_at", { ascending: false }).limit(1)),
    ]);

    // Silence unused warning
    void isAdmin;

    return {
      loja,
      clientes: clientes.count ?? 0,
      transacoes: transacoes.count ?? 0,
      alertas: alertas.count ?? 0,
      processamentos: procs.count ?? 0,
      ultimoProcessamento: (ultimo.data as any)?.[0] ?? null,
    };
  });
