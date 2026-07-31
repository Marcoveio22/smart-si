import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { applyCommonFilters, pageRange, type DashboardFilters } from "./filters";

type DB = SupabaseClient<Database>;
type OcorrenciaStatus = Database["public"]["Enums"]["ocorrencia_status"];

/** GET /ocorrencias — lista paginada com filtros. */
export async function listarOcorrencias(supabase: DB, f: DashboardFilters) {
  const { fromIdx, toIdx } = pageRange(f);
  let q = supabase
    .from("dashboard_ocorrencias")
    .select("*", { count: "exact" })
    .order("data_ocorrencia", { ascending: false })
    .range(fromIdx, toIdx);
  q = applyCommonFilters(q, f);
  const res = await q;
  if (res.error) throw new Error(res.error.message);
  return { rows: res.data ?? [], total: res.count ?? 0, page: f.page, pageSize: f.pageSize };
}

/** GET /ocorrencias/:id — ocorrência + produtos + histórico + financeiro. */
export async function obterOcorrencia(supabase: DB, id: string) {
  const [oc, produtos, log, cobrancas, recuperacoes, imagens] = await Promise.all([
    supabase.from("dashboard_ocorrencias").select("*").eq("id", id).maybeSingle(),
    supabase.from("ocorrencia_produtos").select("*, produtos(nome, categoria)").eq("ocorrencia_id", id),
    supabase.from("ocorrencia_status_log").select("*").eq("ocorrencia_id", id).order("data_hora", { ascending: false }),
    supabase.from("cobrancas").select("*").eq("ocorrencia_id", id).order("created_at", { ascending: false }),
    supabase.from("recuperacoes").select("*").eq("ocorrencia_id", id).order("data", { ascending: false }),
    supabase.from("ocorrencia_imagens").select("*").eq("ocorrencia_id", id).order("ordem", { ascending: true }),
  ]);
  const err = oc.error ?? produtos.error ?? log.error ?? cobrancas.error ?? recuperacoes.error ?? imagens.error;
  if (err) throw new Error(err.message);
  if (!oc.data) throw new Error("Ocorrência não encontrada");

  return {
    ocorrencia: oc.data,
    produtos: produtos.data ?? [],
    historicoStatus: log.data ?? [],
    cobrancas: cobrancas.data ?? [],
    recuperacoes: recuperacoes.data ?? [],
    imagens: imagens.data ?? [],
  };
}

/** GET /ocorrencias/:id/imagens */
export async function listarImagens(supabase: DB, ocorrenciaId: string) {
  const { data, error } = await supabase
    .from("ocorrencia_imagens")
    .select("*")
    .eq("ocorrencia_id", ocorrenciaId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** PATCH /ocorrencias/status — a trilha de histórico é gravada por trigger. */
export async function atualizarStatus(
  supabase: DB,
  userId: string,
  input: { id: string; status: OcorrenciaStatus; observacao?: string | null },
) {
  const patch: Database["public"]["Tables"]["ocorrencias"]["Update"] = {
    status: input.status,
    status_usuario: userId,
    ...(input.observacao != null ? { observacoes: input.observacao } : {}),
  };
  const { data, error } = await supabase
    .from("ocorrencias")
    .update(patch)
    .eq("id", input.id)
    .select("id, status, status_data, status_usuario")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ocorrência não encontrada ou sem permissão");
  return data;
}

/** POST /cobrancas */
export async function criarCobranca(
  supabase: DB,
  userId: string,
  input: {
    ocorrenciaId: string;
    clienteId?: string | null;
    valor: number;
    formaEnvio?: string | null;
    dataEnvio?: string | null;
    pdfUrl?: string | null;
    whatsappEnviado?: boolean;
    observacao?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("cobrancas")
    .insert({
      ocorrencia_id: input.ocorrenciaId,
      cliente_id: input.clienteId ?? null,
      valor: input.valor,
      forma_envio: input.formaEnvio ?? null,
      data_envio: input.dataEnvio ?? null,
      status: input.dataEnvio ? "Enviada" : "Pendente",
      pdf_url: input.pdfUrl ?? null,
      whatsapp_enviado: input.whatsappEnviado ?? false,
      observacao: input.observacao ?? null,
      usuario: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** POST /recuperacoes — o valor recuperado da ocorrência é somado por trigger. */
export async function criarRecuperacao(
  supabase: DB,
  userId: string,
  input: {
    ocorrenciaId: string;
    cobrancaId?: string | null;
    valor: number;
    forma: Database["public"]["Enums"]["recuperacao_forma"];
    data?: string | null;
    observacao?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("recuperacoes")
    .insert({
      ocorrencia_id: input.ocorrenciaId,
      cobranca_id: input.cobrancaId ?? null,
      valor: input.valor,
      forma: input.forma,
      data: input.data ?? new Date().toISOString(),
      observacao: input.observacao ?? null,
      usuario: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
