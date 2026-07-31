ALTER TABLE public.ocorrencias
  ADD COLUMN IF NOT EXISTS status public.ocorrencia_status NOT NULL DEFAULT 'Nova',
  ADD COLUMN IF NOT EXISTS status_data timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status_usuario uuid,
  ADD COLUMN IF NOT EXISTS valor_perdido numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_recuperado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS data_cobranca timestamptz,
  ADD COLUMN IF NOT EXISTS data_pagamento timestamptz,
  ADD COLUMN IF NOT EXISTS data_resolucao timestamptz,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS origem public.ocorrencia_origem NOT NULL DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS prioridade public.ocorrencia_prioridade NOT NULL DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS tipo_ocorrencia text,
  ADD COLUMN IF NOT EXISTS produto_principal text,
  ADD COLUMN IF NOT EXISTS cliente_recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Backfill status from legacy boolean
UPDATE public.ocorrencias SET status = 'Finalizada' WHERE resolvida IS TRUE AND status = 'Nova';
UPDATE public.ocorrencias SET tipo_ocorrencia = tipo WHERE tipo_ocorrencia IS NULL;
UPDATE public.ocorrencias o
   SET cliente_id = c.id
  FROM public.clientes c
 WHERE o.cliente_id IS NULL
   AND c.numero_cartao = o.numero_cartao
   AND (c.loja_id = o.loja_id OR o.loja_id IS NULL);

-- Keep legacy `resolvida` in sync with `status`
CREATE OR REPLACE FUNCTION public.sync_ocorrencia_legacy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('Finalizada','Arquivada','Pagamento Recebido') THEN
    NEW.resolvida := true;
    IF NEW.data_resolucao IS NULL THEN NEW.data_resolucao := now(); END IF;
  ELSE
    NEW.resolvida := false;
  END IF;
  IF NEW.tipo_ocorrencia IS NULL THEN NEW.tipo_ocorrencia := NEW.tipo; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ocorrencia_legacy ON public.ocorrencias;
CREATE TRIGGER trg_sync_ocorrencia_legacy
BEFORE INSERT OR UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.sync_ocorrencia_legacy();

CREATE INDEX IF NOT EXISTS idx_ocorrencias_loja_status ON public.ocorrencias(loja_id, status);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_loja_data ON public.ocorrencias(loja_id, data_ocorrencia DESC);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_cliente ON public.ocorrencias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_cartao ON public.ocorrencias(loja_id, numero_cartao);