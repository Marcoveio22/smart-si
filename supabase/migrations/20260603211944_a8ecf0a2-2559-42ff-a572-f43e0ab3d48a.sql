
-- LOJAS
CREATE TABLE public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lojas TO authenticated;
GRANT ALL ON public.lojas TO service_role;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read lojas" ON public.lojas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write lojas" ON public.lojas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  loja_id UUID REFERENCES public.lojas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CLIENTES
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id),
  numero_cartao TEXT NOT NULL UNIQUE,
  rating_final TEXT NOT NULL DEFAULT 'SILVER',
  score_confianca NUMERIC NOT NULL DEFAULT 0,
  total_compras INT NOT NULL DEFAULT 0,
  total_gasto NUMERIC NOT NULL DEFAULT 0,
  ocorrencias INT NOT NULL DEFAULT 0,
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  ultima_compra TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TRANSACOES
CREATE TABLE public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id),
  cliente_id UUID REFERENCES public.clientes(id),
  numero_cartao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_transacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'aprovada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transacoes TO authenticated;
GRANT ALL ON public.transacoes TO service_role;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all transacoes" ON public.transacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ALERTAS
CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  loja_id UUID REFERENCES public.lojas(id),
  tipo TEXT NOT NULL,
  gravidade TEXT NOT NULL DEFAULT 'media',
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas TO authenticated;
GRANT ALL ON public.alertas TO service_role;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all alertas" ON public.alertas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- OCORRENCIAS
CREATE TABLE public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id),
  numero_cartao TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  data_ocorrencia TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvida BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencias TO authenticated;
GRANT ALL ON public.ocorrencias TO service_role;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all ocorrencias" ON public.ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROCESSAMENTOS
CREATE TABLE public.processamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id),
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
  total_transacoes INT DEFAULT 0,
  faturamento_total NUMERIC DEFAULT 0,
  clientes_red INT DEFAULT 0,
  clientes_trusted INT DEFAULT 0,
  threshold_diamond NUMERIC DEFAULT 0,
  threshold_gold NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aguardando',
  arquivo_diaria TEXT,
  arquivo_historico TEXT,
  erro_mensagem TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processamentos TO authenticated;
GRANT ALL ON public.processamentos TO service_role;
ALTER TABLE public.processamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all processamentos" ON public.processamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RATING_LOGS
CREATE TABLE public.rating_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  rating_anterior TEXT,
  rating_novo TEXT,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rating_logs TO authenticated;
GRANT ALL ON public.rating_logs TO service_role;
ALTER TABLE public.rating_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all rating_logs" ON public.rating_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_upd_clientes BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_upd_ocorrencias BEFORE UPDATE ON public.ocorrencias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_upd_processamentos BEFORE UPDATE ON public.processamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed loja default
INSERT INTO public.lojas (id, nome, endereco) VALUES ('00000000-0000-0000-0000-000000000001', 'Loja Matriz', 'Sede - São Paulo');
