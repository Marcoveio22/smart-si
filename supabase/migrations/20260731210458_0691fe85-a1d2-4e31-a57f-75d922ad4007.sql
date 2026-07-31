CREATE TABLE IF NOT EXISTS public.ocorrencia_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  thumbnail text,
  ordem integer NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'foto',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oc_img_ocorrencia ON public.ocorrencia_imagens(ocorrencia_id, ordem);
CREATE INDEX IF NOT EXISTS idx_oc_img_loja ON public.ocorrencia_imagens(loja_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencia_imagens TO authenticated;
GRANT ALL ON public.ocorrencia_imagens TO service_role;
ALTER TABLE public.ocorrencia_imagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loja scoped ocorrencia_imagens" ON public.ocorrencia_imagens;
CREATE POLICY "loja scoped ocorrencia_imagens" ON public.ocorrencia_imagens FOR ALL TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)))
WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND public.user_has_loja(auth.uid(), o.loja_id)));

CREATE OR REPLACE FUNCTION public.set_oc_img_loja()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.loja_id IS NULL THEN
    SELECT o.loja_id INTO NEW.loja_id FROM public.ocorrencias o WHERE o.id = NEW.ocorrencia_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_set_oc_img_loja ON public.ocorrencia_imagens;
CREATE TRIGGER trg_set_oc_img_loja BEFORE INSERT OR UPDATE ON public.ocorrencia_imagens
FOR EACH ROW EXECUTE FUNCTION public.set_oc_img_loja();