ALTER TABLE public.processamentos
  ADD COLUMN IF NOT EXISTS arquivo_consolidado_nome text,
  ADD COLUMN IF NOT EXISTS arquivo_consolidado_path text,
  ADD COLUMN IF NOT EXISTS arquivo_consolidado_gerado_em timestamptz;