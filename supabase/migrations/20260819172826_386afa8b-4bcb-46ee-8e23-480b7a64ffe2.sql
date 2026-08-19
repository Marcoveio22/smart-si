CREATE TABLE IF NOT EXISTS public.loja_nayax_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  ultimo_id_processado bigint,
  ultima_sincronizacao timestamptz,
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id)
);

GRANT ALL ON public.loja_nayax_credentials TO service_role;

ALTER TABLE public.loja_nayax_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nayax_credentials_no_client_access" ON public.loja_nayax_credentials;
CREATE POLICY "nayax_credentials_no_client_access"
  ON public.loja_nayax_credentials FOR SELECT TO authenticated
  USING (false);

DROP TRIGGER IF EXISTS trg_upd_nayax_credentials ON public.loja_nayax_credentials;
CREATE TRIGGER trg_upd_nayax_credentials BEFORE UPDATE ON public.loja_nayax_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS nayax_transaction_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS transacoes_nayax_transaction_id_key
  ON public.transacoes (nayax_transaction_id);