CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sku text,
  categoria text,
  valor_referencia numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_produtos_loja_nome ON public.produtos(loja_id, lower(nome));
CREATE INDEX IF NOT EXISTS idx_produtos_loja ON public.produtos(loja_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loja scoped produtos" ON public.produtos;
CREATE POLICY "loja scoped produtos" ON public.produtos FOR ALL TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id))
WITH CHECK (public.is_admin() OR public.user_has_loja(auth.uid(), loja_id));

DROP TRIGGER IF EXISTS trg_produtos_updated_at ON public.produtos;
CREATE TRIGGER trg_produtos_updated_at BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ocorrencia_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  descricao text,
  quantidade numeric NOT NULL DEFAULT 1,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oc_prod_ocorrencia ON public.ocorrencia_produtos(ocorrencia_id);
CREATE INDEX IF NOT EXISTS idx_oc_prod_produto ON public.ocorrencia_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_oc_prod_loja ON public.ocorrencia_produtos(loja_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencia_produtos TO authenticated;
GRANT ALL ON public.ocorrencia_produtos TO service_role;
ALTER TABLE public.ocorrencia_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loja scoped ocorrencia_produtos" ON public.ocorrencia_produtos;
CREATE POLICY "loja scoped ocorrencia_produtos" ON public.ocorrencia_produtos FOR ALL TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)))
WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)));

-- Inherit loja_id from parent occurrence
CREATE OR REPLACE FUNCTION public.set_oc_prod_loja()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.loja_id IS NULL THEN
    SELECT o.loja_id INTO NEW.loja_id FROM public.ocorrencias o WHERE o.id = NEW.ocorrencia_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_set_oc_prod_loja ON public.ocorrencia_produtos;
CREATE TRIGGER trg_set_oc_prod_loja BEFORE INSERT OR UPDATE ON public.ocorrencia_produtos
FOR EACH ROW EXECUTE FUNCTION public.set_oc_prod_loja();

-- Recalculate valor_perdido / produto_principal from items
CREATE OR REPLACE FUNCTION public.recalc_ocorrencia_produtos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _oc uuid; _total numeric; _principal text;
BEGIN
  _oc := COALESCE(NEW.ocorrencia_id, OLD.ocorrencia_id);
  SELECT COALESCE(SUM(op.valor * op.quantidade), 0) INTO _total
    FROM public.ocorrencia_produtos op WHERE op.ocorrencia_id = _oc;
  SELECT COALESCE(p.nome, op.descricao) INTO _principal
    FROM public.ocorrencia_produtos op
    LEFT JOIN public.produtos p ON p.id = op.produto_id
   WHERE op.ocorrencia_id = _oc
   ORDER BY (op.valor * op.quantidade) DESC NULLS LAST LIMIT 1;
  UPDATE public.ocorrencias
     SET valor_perdido = _total, produto_principal = _principal
   WHERE id = _oc;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.recalc_ocorrencia_produtos() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_recalc_ocorrencia_produtos ON public.ocorrencia_produtos;
CREATE TRIGGER trg_recalc_ocorrencia_produtos
AFTER INSERT OR UPDATE OR DELETE ON public.ocorrencia_produtos
FOR EACH ROW EXECUTE FUNCTION public.recalc_ocorrencia_produtos();