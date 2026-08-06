-- Fase 0 "Blindagem" — Correção C3
DO $$
DECLARE con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.clientes'::regclass
    AND contype = 'u'
    AND conkey = ARRAY[(
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'public.clientes'::regclass AND attname = 'numero_cartao'
    )];
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.clientes DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_loja_numero_cartao_key UNIQUE (loja_id, numero_cartao);