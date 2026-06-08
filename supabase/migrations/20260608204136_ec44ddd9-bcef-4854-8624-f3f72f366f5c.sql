ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS status_manual text NOT NULL DEFAULT 'NEUTRO',
  ADD COLUMN IF NOT EXISTS status_manual_desde timestamptz,
  ADD COLUMN IF NOT EXISTS status_manual_por uuid,
  ADD COLUMN IF NOT EXISTS status_manual_observacao text;

ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_status_manual_check;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_status_manual_check
  CHECK (status_manual IN ('TRUSTED','NEUTRO','RED_FLAG'));