-- Recorrentes
CREATE OR REPLACE VIEW public.vw_clientes_recorrentes
WITH (security_invoker = on) AS
SELECT
  o.loja_id,
  o.cliente_id,
  COALESCE(c.numero_cartao, o.numero_cartao) AS numero_cartao,
  c.rating_final,
  c.status_manual,
  COUNT(*)::int                       AS total_ocorrencias,
  COALESCE(SUM(o.valor_perdido),0)    AS valor_perdido,
  COALESCE(SUM(o.valor_recuperado),0) AS valor_recuperado,
  MIN(o.data_ocorrencia)              AS primeira_ocorrencia,
  MAX(o.data_ocorrencia)              AS ultima_ocorrencia,
  (CURRENT_DATE - MAX(o.data_ocorrencia)::date)::int AS dias_desde_ultima
FROM public.ocorrencias o
LEFT JOIN public.clientes c ON c.id = o.cliente_id
GROUP BY o.loja_id, o.cliente_id, COALESCE(c.numero_cartao, o.numero_cartao), c.rating_final, c.status_manual;

-- Ocorrências (flat, pronta para filtros)
CREATE OR REPLACE VIEW public.dashboard_ocorrencias
WITH (security_invoker = on) AS
SELECT
  o.id, o.loja_id, l.nome AS loja_nome, o.cliente_id,
  COALESCE(c.numero_cartao, o.numero_cartao) AS numero_cartao,
  c.rating_final, c.status_manual,
  o.status, o.status_data, o.status_usuario,
  o.prioridade, o.origem,
  COALESCE(o.tipo_ocorrencia, o.tipo) AS tipo_ocorrencia,
  o.produto_principal, o.responsavel, o.created_by,
  o.valor_perdido, o.valor_recuperado,
  (o.valor_perdido - o.valor_recuperado) AS valor_pendente,
  o.data_ocorrencia, o.data_cobranca, o.data_pagamento, o.data_resolucao,
  o.cliente_recorrente, o.descricao, o.observacoes,
  date_trunc('day', o.data_ocorrencia)   AS dia,
  date_trunc('month', o.data_ocorrencia) AS mes,
  EXTRACT(hour FROM o.data_ocorrencia)::int AS hora,
  EXTRACT(dow  FROM o.data_ocorrencia)::int AS dia_semana
FROM public.ocorrencias o
LEFT JOIN public.clientes c ON c.id = o.cliente_id
LEFT JOIN public.lojas l   ON l.id = o.loja_id;

-- Executivo (por loja e dia)
CREATE OR REPLACE VIEW public.dashboard_executivo
WITH (security_invoker = on) AS
SELECT
  o.loja_id,
  date_trunc('day', o.data_ocorrencia) AS dia,
  COUNT(*)::int AS total_ocorrencias,
  COUNT(*) FILTER (WHERE o.status IN ('Finalizada','Arquivada','Pagamento Recebido'))::int AS ocorrencias_finalizadas,
  COUNT(*) FILTER (WHERE o.status NOT IN ('Finalizada','Arquivada'))::int AS ocorrencias_abertas,
  COUNT(DISTINCT o.cliente_id)::int AS clientes_envolvidos,
  COALESCE(SUM(o.valor_perdido),0)    AS valor_perdido,
  COALESCE(SUM(o.valor_recuperado),0) AS valor_recuperado
FROM public.ocorrencias o
GROUP BY o.loja_id, date_trunc('day', o.data_ocorrencia);

-- Financeiro (por ocorrência)
CREATE OR REPLACE VIEW public.dashboard_financeiro
WITH (security_invoker = on) AS
SELECT
  o.id AS ocorrencia_id, o.loja_id, o.cliente_id,
  o.status, o.data_ocorrencia,
  date_trunc('month', o.data_ocorrencia) AS mes,
  o.valor_perdido,
  o.valor_recuperado,
  (o.valor_perdido - o.valor_recuperado) AS valor_pendente,
  COALESCE(cb.total_cobrado, 0) AS total_cobrado,
  COALESCE(cb.qtd_cobrancas, 0) AS qtd_cobrancas,
  cb.ultima_cobranca,
  COALESCE(rc.qtd_recuperacoes, 0) AS qtd_recuperacoes,
  rc.ultima_recuperacao
FROM public.ocorrencias o
LEFT JOIN (
  SELECT ocorrencia_id, SUM(valor) AS total_cobrado, COUNT(*)::int AS qtd_cobrancas, MAX(data_envio) AS ultima_cobranca
  FROM public.cobrancas GROUP BY ocorrencia_id
) cb ON cb.ocorrencia_id = o.id
LEFT JOIN (
  SELECT ocorrencia_id, COUNT(*)::int AS qtd_recuperacoes, MAX(data) AS ultima_recuperacao
  FROM public.recuperacoes GROUP BY ocorrencia_id
) rc ON rc.ocorrencia_id = o.id;

-- Produtos
CREATE OR REPLACE VIEW public.dashboard_produtos
WITH (security_invoker = on) AS
SELECT
  op.id, op.loja_id, op.ocorrencia_id, op.produto_id,
  COALESCE(p.nome, op.descricao) AS produto_nome,
  p.categoria,
  op.quantidade,
  op.valor,
  (op.quantidade * op.valor) AS valor_total,
  o.data_ocorrencia,
  o.status,
  o.cliente_id,
  date_trunc('month', o.data_ocorrencia) AS mes
FROM public.ocorrencia_produtos op
JOIN public.ocorrencias o ON o.id = op.ocorrencia_id
LEFT JOIN public.produtos p ON p.id = op.produto_id;

-- Clientes (visão consolidada)
CREATE OR REPLACE VIEW public.dashboard_clientes
WITH (security_invoker = on) AS
SELECT
  c.id AS cliente_id, c.loja_id, c.numero_cartao,
  c.rating_final, c.status_manual, c.is_trusted,
  c.score_confianca, c.total_compras, c.total_gasto, c.ultima_compra,
  COALESCE(o.total_ocorrencias, 0)  AS total_ocorrencias,
  COALESCE(o.valor_perdido, 0)      AS valor_perdido,
  COALESCE(o.valor_recuperado, 0)   AS valor_recuperado,
  o.primeira_ocorrencia,
  o.ultima_ocorrencia,
  (CURRENT_DATE - o.ultima_ocorrencia::date)::int AS dias_desde_ultima
FROM public.clientes c
LEFT JOIN (
  SELECT cliente_id,
         COUNT(*)::int AS total_ocorrencias,
         SUM(valor_perdido) AS valor_perdido,
         SUM(valor_recuperado) AS valor_recuperado,
         MIN(data_ocorrencia) AS primeira_ocorrencia,
         MAX(data_ocorrencia) AS ultima_ocorrencia
    FROM public.ocorrencias WHERE cliente_id IS NOT NULL GROUP BY cliente_id
) o ON o.cliente_id = c.id;

GRANT SELECT ON public.vw_clientes_recorrentes,
               public.dashboard_ocorrencias,
               public.dashboard_executivo,
               public.dashboard_financeiro,
               public.dashboard_produtos,
               public.dashboard_clientes
TO authenticated;

-- Aggregation helpers (RLS-respecting, SECURITY INVOKER by default)
CREATE OR REPLACE FUNCTION public.faturamento_por_mes(_loja_id uuid DEFAULT NULL, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE (mes text, total numeric, transacoes bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT to_char(date_trunc('month', t.data_transacao), 'YYYY-MM') AS mes,
         COALESCE(SUM(t.valor), 0) AS total,
         COUNT(*) AS transacoes
    FROM public.transacoes t
   WHERE (_loja_id IS NULL OR t.loja_id = _loja_id)
     AND (_from IS NULL OR t.data_transacao >= _from)
     AND (_to   IS NULL OR t.data_transacao <= _to)
   GROUP BY 1 ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_horarios(_loja_id uuid DEFAULT NULL, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE (dia_semana int, hora int, total bigint, valor numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXTRACT(dow FROM o.data_ocorrencia)::int,
         EXTRACT(hour FROM o.data_ocorrencia)::int,
         COUNT(*), COALESCE(SUM(o.valor_perdido), 0)
    FROM public.ocorrencias o
   WHERE (_loja_id IS NULL OR o.loja_id = _loja_id)
     AND (_from IS NULL OR o.data_ocorrencia >= _from)
     AND (_to   IS NULL OR o.data_ocorrencia <= _to)
   GROUP BY 1, 2 ORDER BY 1, 2;
$$;

CREATE OR REPLACE FUNCTION public.faturamento_total(_loja_id uuid DEFAULT NULL, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS numeric
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(SUM(t.valor), 0)
    FROM public.transacoes t
   WHERE (_loja_id IS NULL OR t.loja_id = _loja_id)
     AND (_from IS NULL OR t.data_transacao >= _from)
     AND (_to   IS NULL OR t.data_transacao <= _to);
$$;

REVOKE ALL ON FUNCTION public.faturamento_por_mes(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dashboard_horarios(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.faturamento_total(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.faturamento_por_mes(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_horarios(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.faturamento_total(uuid, timestamptz, timestamptz) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_transacoes_loja_data ON public.transacoes(loja_id, data_transacao);