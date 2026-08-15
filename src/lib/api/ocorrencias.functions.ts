import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseFilters } from "./filters";
import {
  atualizarStatus,
  criarCobranca,
  criarOcorrenciaComProdutos,
  criarRecuperacao,
  listarImagens,
  listarOcorrencias,
  obterOcorrencia,
} from "./ocorrencias.service";

const statusEnum = z.enum([
  "Nova",
  "Em análise",
  "Comunicado ao Síndico",
  "Comunicado ao RH",
  "Negociação",
  "Cobrança Enviada",
  "Pagamento Recebido",
  "Finalizada",
  "Arquivada",
]);

const formaEnum = z.enum(["PIX", "Dinheiro", "Cartão", "Boleto", "Desconto em folha", "Outro"]);

/** GET /ocorrencias */
export const getOcorrencias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseFilters)
  .handler(({ data, context }) => listarOcorrencias(context.supabase, data));

/** GET /ocorrencias/:id */
export const getOcorrencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(({ data, context }) => obterOcorrencia(context.supabase, data.id));

/** GET /ocorrencias/:id/imagens */
export const getOcorrenciaImagens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(({ data, context }) => listarImagens(context.supabase, data.id));

/** PATCH /ocorrencias/status */
export const updateOcorrenciaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: statusEnum, observacao: z.string().max(2000).nullish() }).parse(d),
  )
  .handler(({ data, context }) => atualizarStatus(context.supabase, context.userId, data));

/** POST /cobrancas */
export const createCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        ocorrenciaId: z.string().uuid(),
        clienteId: z.string().uuid().nullish(),
        valor: z.number().nonnegative(),
        formaEnvio: z.string().max(60).nullish(),
        dataEnvio: z.string().datetime().nullish(),
        pdfUrl: z.string().max(500).nullish(),
        whatsappEnviado: z.boolean().optional(),
        observacao: z.string().max(2000).nullish(),
      })
      .parse(d),
  )
  .handler(({ data, context }) => criarCobranca(context.supabase, context.userId, data));

/** POST /recuperacoes */
export const createRecuperacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        ocorrenciaId: z.string().uuid(),
        cobrancaId: z.string().uuid().nullish(),
        valor: z.number().positive(),
        forma: formaEnum,
        data: z.string().datetime().nullish(),
        observacao: z.string().max(2000).nullish(),
      })
      .parse(d),
  )
  .handler(({ data, context }) => criarRecuperacao(context.supabase, context.userId, data));

/** POST /ocorrencias — cria ocorrência manual (card de alerta) com produtos. */
export const createOcorrenciaComProdutos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lojaId: z.string().uuid(),
        numeroCartao: z.string().min(1).max(120),
        tipo: z.string().min(1).max(60),
        prioridade: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
        valorPerdido: z.number().nonnegative().optional(),
        descricao: z.string().max(2000).nullish(),
        observacoes: z.string().max(2000).nullish(),
        origem: z.enum(["Manual", "Upload", "Automática", "Integração"]).optional(),
        dataOcorrencia: z.string().nullish(),
        produtos: z.array(z.string().max(200)).optional(),
      })
      .parse(d),
  )
  .handler(({ data, context }) => criarOcorrenciaComProdutos(context.supabase, context.userId, data));
