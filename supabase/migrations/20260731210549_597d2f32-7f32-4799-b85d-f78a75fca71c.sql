CREATE TABLE IF NOT EXISTS public.cobrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  valor numeric NOT NULL DEFAULT 0,
  status public.cobranca_status NOT NULL DEFAULT 'Pendente',
  forma_envio text,
  data_envio timestamptz,
  data_pagamento timestamptz,
  pdf_url text,
  whatsapp_enviado boolean NOT NULL DEFAULT false,
  usuario uuid,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cobrancas_ocorrencia ON public.cobrancas(ocorrencia_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_loja_status ON public.cobrancas(loja_id, status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_cliente ON public.cobrancas(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas TO authenticated;
GRANT ALL ON public.cobrancas TO service_role;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loja scoped cobrancas" ON public.cobrancas;
CREATE POLICY "loja scoped cobrancas" ON public.cobrancas FOR ALL TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)))
WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)));

DROP TRIGGER IF EXISTS trg_cobrancas_updated_at ON public.cobrancas;
CREATE TRIGGER trg_cobrancas_updated_at BEFORE UPDATE ON public.cobrancas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.recuperacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  cobranca_id uuid REFERENCES public.cobrancas(id) ON DELETE SET NULL,
  loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  valor numeric NOT NULL DEFAULT 0,
  forma public.recuperacao_forma NOT NULL DEFAULT 'PIX',
  data timestamptz NOT NULL DEFAULT now(),
  usuario uuid,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recuperacoes_ocorrencia ON public.recuperacoes(ocorrencia_id);
CREATE INDEX IF NOT EXISTS idx_recuperacoes_loja_data ON public.recuperacoes(loja_id, data DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recuperacoes TO authenticated;
GRANT ALL ON public.recuperacoes TO service_role;
ALTER TABLE public.recuperacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loja scoped recuperacoes" ON public.recuperacoes;
CREATE POLICY "loja scoped recuperacoes" ON public.recuperacoes FOR ALL TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)))
WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)));

-- inherit loja_id
CREATE OR REPLACE FUNCTION public.set_financeiro_loja()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.loja_id IS NULL THEN
    SELECT o.loja_id INTO NEW.loja_id FROM public.ocorrencias o WHERE o.id = NEW.ocorrencia_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_set_cobranca_loja ON public.cobrancas;
CREATE TRIGGER trg_set_cobranca_loja BEFORE INSERT OR UPDATE ON public.cobrancas
FOR EACH ROW EXECUTE FUNCTION public.set_financeiro_loja();
DROP TRIGGER IF EXISTS trg_set_recuperacao_loja ON public.recuperacoes;
CREATE TRIGGER trg_set_recuperacao_loja BEFORE INSERT OR UPDATE ON public.recuperacoes
FOR EACH ROW EXECUTE FUNCTION public.set_financeiro_loja();

-- roll recuperações up into ocorrencias
CREATE OR REPLACE FUNCTION public.apply_recuperacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _oc uuid; _total numeric; _perdido numeric; _status public.ocorrencia_status; _ultima timestamptz;
BEGIN
  _oc := COALESCE(NEW.ocorrencia_id, OLD.ocorrencia_id);
  SELECT COALESCE(SUM(valor),0), MAX(data) INTO _total, _ultima FROM public.recuperacoes WHERE ocorrencia_id = _oc;
  SELECT valor_perdido, status INTO _perdido, _status FROM public.ocorrencias WHERE id = _oc;
  UPDATE public.ocorrencias
     SET valor_recuperado = _total,
         data_pagamento = CASE WHEN _total > 0 THEN COALESCE(data_pagamento, _ultima) ELSE data_pagamento END,
         status = CASE
                    WHEN _total > 0 AND _perdido > 0 AND _total >= _perdido
                         AND _status NOT IN ('Finalizada','Arquivada') THEN 'Pagamento Recebido'::public.ocorrencia_status
                    ELSE _status
                  END
   WHERE id = _oc;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.apply_recuperacao() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_apply_recuperacao ON public.recuperacoes;
CREATE TRIGGER trg_apply_recuperacao AFTER INSERT OR UPDATE OR DELETE ON public.recuperacoes
FOR EACH ROW EXECUTE FUNCTION public.apply_recuperacao();

-- cobrança sent -> reflect on ocorrencia
CREATE OR REPLACE FUNCTION public.apply_cobranca()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.data_envio IS NOT NULL THEN
    UPDATE public.ocorrencias
       SET data_cobranca = COALESCE(data_cobranca, NEW.data_envio),
           status = CASE WHEN status IN ('Nova','Em análise','Comunicado ao Síndico','Comunicado ao RH','Negociação')
                         THEN 'Cobrança Enviada'::public.ocorrencia_status ELSE status END
     WHERE id = NEW.ocorrencia_id;
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.apply_cobranca() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_apply_cobranca ON public.cobrancas;
CREATE TRIGGER trg_apply_cobranca AFTER INSERT OR UPDATE ON public.cobrancas
FOR EACH ROW EXECUTE FUNCTION public.apply_cobranca();