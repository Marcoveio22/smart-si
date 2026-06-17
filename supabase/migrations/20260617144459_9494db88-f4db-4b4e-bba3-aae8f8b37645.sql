ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;
ALTER TABLE public.processamentos ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;
ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_loja_id ON public.clientes(loja_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_loja_id ON public.transacoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_processamentos_loja_id ON public.processamentos(loja_id);
CREATE INDEX IF NOT EXISTS idx_alertas_loja_id ON public.alertas(loja_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_loja_id ON public.ocorrencias(loja_id);