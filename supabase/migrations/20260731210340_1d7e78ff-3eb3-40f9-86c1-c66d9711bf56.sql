CREATE TABLE IF NOT EXISTS public.ocorrencia_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  status_anterior public.ocorrencia_status,
  status_novo public.ocorrencia_status NOT NULL,
  usuario uuid,
  data_hora timestamptz NOT NULL DEFAULT now(),
  observacao text
);

GRANT SELECT ON public.ocorrencia_status_log TO authenticated;
GRANT ALL ON public.ocorrencia_status_log TO service_role;

ALTER TABLE public.ocorrencia_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loja scoped read status log" ON public.ocorrencia_status_log;
CREATE POLICY "loja scoped read status log"
ON public.ocorrencia_status_log FOR SELECT TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

CREATE INDEX IF NOT EXISTS idx_status_log_ocorrencia ON public.ocorrencia_status_log(ocorrencia_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_status_log_loja ON public.ocorrencia_status_log(loja_id, data_hora DESC);

CREATE OR REPLACE FUNCTION public.log_ocorrencia_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ocorrencia_status_log (ocorrencia_id, loja_id, status_anterior, status_novo, usuario, observacao)
    VALUES (NEW.id, NEW.loja_id, NULL, NEW.status, COALESCE(NEW.status_usuario, auth.uid()), 'Ocorrência criada');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ocorrencia_status_log (ocorrencia_id, loja_id, status_anterior, status_novo, usuario, observacao)
    VALUES (NEW.id, NEW.loja_id, OLD.status, NEW.status, COALESCE(NEW.status_usuario, auth.uid()), NEW.observacoes);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_ocorrencia_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_ocorrencia_status ON public.ocorrencias;
CREATE TRIGGER trg_log_ocorrencia_status
AFTER INSERT OR UPDATE OF status ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.log_ocorrencia_status();

-- Stamp status metadata on change
CREATE OR REPLACE FUNCTION public.stamp_ocorrencia_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_data := now();
    NEW.status_usuario := COALESCE(NEW.status_usuario, auth.uid());
    IF NEW.status = 'Cobrança Enviada' AND NEW.data_cobranca IS NULL THEN NEW.data_cobranca := now(); END IF;
    IF NEW.status = 'Pagamento Recebido' AND NEW.data_pagamento IS NULL THEN NEW.data_pagamento := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_ocorrencia_status ON public.ocorrencias;
CREATE TRIGGER trg_stamp_ocorrencia_status
BEFORE UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.stamp_ocorrencia_status();