CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  loja_id uuid,
  acao text NOT NULL,
  usuario uuid,
  valor_anterior jsonb,
  valor_novo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_registro ON public.audit_log(tabela, registro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_loja ON public.audit_log(loja_id, created_at DESC);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loja scoped read audit" ON public.audit_log;
CREATE POLICY "loja scoped read audit" ON public.audit_log FOR SELECT TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old jsonb; _new jsonb; _loja uuid; _rid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD); _new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    _old := NULL; _new := to_jsonb(NEW);
  ELSE
    _old := to_jsonb(OLD); _new := to_jsonb(NEW);
    IF _old = _new THEN RETURN NULL; END IF;
  END IF;

  _rid := COALESCE((_new->>'id')::uuid, (_old->>'id')::uuid);
  _loja := COALESCE((_new->>'loja_id')::uuid, (_old->>'loja_id')::uuid);

  INSERT INTO public.audit_log (tabela, registro_id, loja_id, acao, usuario, valor_anterior, valor_novo)
  VALUES (TG_TABLE_NAME, _rid, _loja, TG_OP, auth.uid(), _old, _new);
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.audit_row() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_ocorrencias ON public.ocorrencias;
CREATE TRIGGER trg_audit_ocorrencias AFTER INSERT OR UPDATE OR DELETE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.audit_row();

DROP TRIGGER IF EXISTS trg_audit_cobrancas ON public.cobrancas;
CREATE TRIGGER trg_audit_cobrancas AFTER INSERT OR UPDATE OR DELETE ON public.cobrancas
FOR EACH ROW EXECUTE FUNCTION public.audit_row();

DROP TRIGGER IF EXISTS trg_audit_recuperacoes ON public.recuperacoes;
CREATE TRIGGER trg_audit_recuperacoes AFTER INSERT OR UPDATE OR DELETE ON public.recuperacoes
FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- clientes: only audit manual status changes to avoid bulk-engine noise
CREATE OR REPLACE FUNCTION public.audit_cliente_status_manual()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status_manual IS DISTINCT FROM OLD.status_manual THEN
    INSERT INTO public.audit_log (tabela, registro_id, loja_id, acao, usuario, valor_anterior, valor_novo)
    VALUES ('clientes', NEW.id, NEW.loja_id, 'STATUS_MANUAL', COALESCE(NEW.status_manual_por, auth.uid()),
            jsonb_build_object('status_manual', OLD.status_manual),
            jsonb_build_object('status_manual', NEW.status_manual, 'observacao', NEW.status_manual_observacao));
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.audit_cliente_status_manual() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_audit_cliente_status_manual ON public.clientes;
CREATE TRIGGER trg_audit_cliente_status_manual AFTER UPDATE OF status_manual ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_cliente_status_manual();