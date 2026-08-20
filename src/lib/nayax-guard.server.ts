// Guarda: somente admin COM vínculo em user_lojas na loja específica.
export async function assertAdminDaLoja(
  context: { supabase: any; userId: string },
  lojaId: string,
) {
  const [{ data: isAdmin }, { data: hasLoja }] = await Promise.all([
    context.supabase.rpc("is_admin"),
    context.supabase.rpc("user_has_loja", { _user_id: context.userId, _loja_id: lojaId }),
  ]);
  if (!isAdmin) throw new Error("Apenas administradores");
  if (!hasLoja) throw new Error("Você não tem vínculo com esta loja");
}
