CREATE OR REPLACE FUNCTION public.faturamento_total(_loja_id uuid DEFAULT NULL::uuid, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _admin boolean; _lojas uuid[]; _total numeric;
BEGIN
  _admin := public.is_admin();
  IF _loja_id IS NOT NULL THEN
    IF NOT (_admin OR public.user_has_loja(auth.uid(), _loja_id)) THEN RETURN 0; END IF;
    _lojas := ARRAY[_loja_id];
  ELSIF _admin THEN
    _lojas := NULL;
  ELSE
    SELECT COALESCE(array_agg(DISTINCT l), '{}') INTO _lojas FROM (
      SELECT ul.loja_id AS l FROM public.user_lojas ul WHERE ul.user_id = auth.uid()
      UNION SELECT p.loja_id FROM public.profiles p WHERE p.id = auth.uid()
    ) s WHERE l IS NOT NULL;
  END IF;

  SELECT COALESCE(SUM(t.valor), 0) INTO _total
    FROM public.transacoes t
   WHERE (_from IS NULL OR t.data_transacao >= _from)
     AND (_to IS NULL OR t.data_transacao <= _to)
     AND (_lojas IS NULL OR t.loja_id = ANY(_lojas));
  RETURN _total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.faturamento_por_mes(_loja_id uuid DEFAULT NULL::uuid, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(mes text, total numeric, transacoes bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _admin boolean; _lojas uuid[];
BEGIN
  _admin := public.is_admin();
  IF _loja_id IS NOT NULL THEN
    IF NOT (_admin OR public.user_has_loja(auth.uid(), _loja_id)) THEN RETURN; END IF;
    _lojas := ARRAY[_loja_id];
  ELSIF _admin THEN
    _lojas := NULL;
  ELSE
    SELECT COALESCE(array_agg(DISTINCT l), '{}') INTO _lojas FROM (
      SELECT ul.loja_id AS l FROM public.user_lojas ul WHERE ul.user_id = auth.uid()
      UNION SELECT p.loja_id FROM public.profiles p WHERE p.id = auth.uid()
    ) s WHERE l IS NOT NULL;
  END IF;

  RETURN QUERY
  SELECT to_char(date_trunc('month', t.data_transacao), 'YYYY-MM'),
         COALESCE(SUM(t.valor), 0),
         COUNT(*)
    FROM public.transacoes t
   WHERE (_from IS NULL OR t.data_transacao >= _from)
     AND (_to IS NULL OR t.data_transacao <= _to)
     AND (_lojas IS NULL OR t.loja_id = ANY(_lojas))
   GROUP BY 1 ORDER BY 1;
END;
$function$;