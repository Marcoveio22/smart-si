
-- 1) Junction table
CREATE TABLE IF NOT EXISTS public.user_lojas (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, loja_id)
);
CREATE INDEX IF NOT EXISTS idx_user_lojas_user ON public.user_lojas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lojas_loja ON public.user_lojas(loja_id);

GRANT SELECT ON public.user_lojas TO authenticated;
GRANT ALL ON public.user_lojas TO service_role;

ALTER TABLE public.user_lojas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own user_lojas" ON public.user_lojas;
CREATE POLICY "read own user_lojas" ON public.user_lojas
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admin manage user_lojas" ON public.user_lojas;
CREATE POLICY "admin manage user_lojas" ON public.user_lojas
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2) Backfill from profiles.loja_id
INSERT INTO public.user_lojas (user_id, loja_id)
SELECT p.id, p.loja_id
FROM public.profiles p
WHERE p.loja_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) Helper function
CREATE OR REPLACE FUNCTION public.user_has_loja(_user_id uuid, _loja_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _loja_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_lojas WHERE user_id = _user_id AND loja_id = _loja_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND loja_id = _loja_id)
  );
$$;

-- 4) Update RLS policies on data tables
DROP POLICY IF EXISTS "loja scoped clientes" ON public.clientes;
CREATE POLICY "loja scoped clientes" ON public.clientes FOR ALL
  USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
  WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped transacoes" ON public.transacoes;
CREATE POLICY "loja scoped transacoes" ON public.transacoes FOR ALL
  USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
  WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped alertas" ON public.alertas;
CREATE POLICY "loja scoped alertas" ON public.alertas FOR ALL
  USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
  WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped ocorrencias" ON public.ocorrencias;
CREATE POLICY "loja scoped ocorrencias" ON public.ocorrencias FOR ALL
  USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
  WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped processamentos" ON public.processamentos;
CREATE POLICY "loja scoped processamentos" ON public.processamentos FOR ALL
  USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
  WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped rating_logs" ON public.rating_logs;
CREATE POLICY "loja scoped rating_logs" ON public.rating_logs FOR ALL
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = rating_logs.cliente_id
        AND public.user_has_loja(auth.uid(), c.loja_id)
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = rating_logs.cliente_id
        AND public.user_has_loja(auth.uid(), c.loja_id)
    )
  );

-- 5) Admin helper: assign/unassign a loja to a user (used by the new UI)
CREATE OR REPLACE FUNCTION public.admin_set_user_lojas(_user_id uuid, _loja_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  DELETE FROM public.user_lojas WHERE user_id = _user_id;
  IF _loja_ids IS NOT NULL AND array_length(_loja_ids, 1) > 0 THEN
    INSERT INTO public.user_lojas (user_id, loja_id)
    SELECT _user_id, x FROM unnest(_loja_ids) AS x
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_lojas(uuid, uuid[]) TO authenticated;
