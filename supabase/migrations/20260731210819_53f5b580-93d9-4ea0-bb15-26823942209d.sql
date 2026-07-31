-- rating_logs: own loja_id for direct scoping
ALTER TABLE public.rating_logs ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;
UPDATE public.rating_logs rl SET loja_id = c.loja_id
  FROM public.clientes c WHERE c.id = rl.cliente_id AND rl.loja_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_rating_logs_loja ON public.rating_logs(loja_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_rating_log_loja()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.loja_id IS NULL AND NEW.cliente_id IS NOT NULL THEN
    SELECT c.loja_id INTO NEW.loja_id FROM public.clientes c WHERE c.id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_set_rating_log_loja ON public.rating_logs;
CREATE TRIGGER trg_set_rating_log_loja BEFORE INSERT OR UPDATE ON public.rating_logs
FOR EACH ROW EXECUTE FUNCTION public.set_rating_log_loja();

-- Recreate tenant policies as TO authenticated
DROP POLICY IF EXISTS "loja scoped clientes" ON public.clientes;
CREATE POLICY "loja scoped clientes" ON public.clientes FOR ALL TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped transacoes" ON public.transacoes;
CREATE POLICY "loja scoped transacoes" ON public.transacoes FOR ALL TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped alertas" ON public.alertas;
CREATE POLICY "loja scoped alertas" ON public.alertas FOR ALL TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped ocorrencias" ON public.ocorrencias;
CREATE POLICY "loja scoped ocorrencias" ON public.ocorrencias FOR ALL TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped processamentos" ON public.processamentos;
CREATE POLICY "loja scoped processamentos" ON public.processamentos FOR ALL TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "loja scoped rating_logs" ON public.rating_logs;
CREATE POLICY "loja scoped rating_logs" ON public.rating_logs FOR ALL TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP POLICY IF EXISTS "admin manage user_lojas" ON public.user_lojas;
CREATE POLICY "admin manage user_lojas" ON public.user_lojas FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "read own user_lojas" ON public.user_lojas;
CREATE POLICY "read own user_lojas" ON public.user_lojas FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

REVOKE ALL ON public.clientes, public.transacoes, public.alertas, public.ocorrencias,
              public.processamentos, public.rating_logs, public.user_lojas FROM anon;

-- Flag recurring clients
CREATE OR REPLACE FUNCTION public.refresh_cliente_recorrente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _n int;
BEGIN
  _cid := COALESCE(NEW.cliente_id, OLD.cliente_id);
  IF _cid IS NULL THEN RETURN NULL; END IF;
  SELECT COUNT(*)::int INTO _n FROM public.ocorrencias WHERE cliente_id = _cid;
  UPDATE public.ocorrencias SET cliente_recorrente = (_n > 1)
   WHERE cliente_id = _cid AND cliente_recorrente IS DISTINCT FROM (_n > 1);
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.refresh_cliente_recorrente() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_refresh_cliente_recorrente ON public.ocorrencias;
CREATE TRIGGER trg_refresh_cliente_recorrente
AFTER INSERT OR DELETE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.refresh_cliente_recorrente();

UPDATE public.ocorrencias o SET cliente_recorrente = true
 WHERE o.cliente_id IN (SELECT cliente_id FROM public.ocorrencias WHERE cliente_id IS NOT NULL GROUP BY cliente_id HAVING COUNT(*) > 1)
   AND o.cliente_recorrente IS DISTINCT FROM true;