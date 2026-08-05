CREATE INDEX IF NOT EXISTS idx_transacoes_data ON public.transacoes (data_transacao);

CREATE OR REPLACE FUNCTION public.faturamento_total(_loja_id uuid DEFAULT NULL::uuid, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(t.valor), 0)
    FROM public.transacoes t
   WHERE (_from IS NULL OR t.data_transacao >= _from)
     AND (_to   IS NULL OR t.data_transacao <= _to)
     AND (
       CASE
         WHEN _loja_id IS NOT NULL THEN t.loja_id = _loja_id AND (public.is_admin() OR public.user_has_loja(auth.uid(), _loja_id))
         WHEN public.is_admin() THEN true
         ELSE t.loja_id IN (
           SELECT ul.loja_id FROM public.user_lojas ul WHERE ul.user_id = auth.uid()
           UNION SELECT p.loja_id FROM public.profiles p WHERE p.id = auth.uid()
         )
       END
     );
$function$;

CREATE OR REPLACE FUNCTION public.faturamento_por_mes(_loja_id uuid DEFAULT NULL::uuid, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(mes text, total numeric, transacoes bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT to_char(date_trunc('month', t.data_transacao), 'YYYY-MM') AS mes,
         COALESCE(SUM(t.valor), 0) AS total,
         COUNT(*) AS transacoes
    FROM public.transacoes t
   WHERE (_from IS NULL OR t.data_transacao >= _from)
     AND (_to   IS NULL OR t.data_transacao <= _to)
     AND (
       CASE
         WHEN _loja_id IS NOT NULL THEN t.loja_id = _loja_id AND (public.is_admin() OR public.user_has_loja(auth.uid(), _loja_id))
         WHEN public.is_admin() THEN true
         ELSE t.loja_id IN (
           SELECT ul.loja_id FROM public.user_lojas ul WHERE ul.user_id = auth.uid()
           UNION SELECT p.loja_id FROM public.profiles p WHERE p.id = auth.uid()
         )
       END
     )
   GROUP BY 1 ORDER BY 1;
$function$;