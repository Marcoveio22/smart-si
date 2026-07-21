
-- 1) Extend lojas
ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 2) Rename existing store to "Loja Principal" and seed sample stores
UPDATE public.lojas SET nome='Loja Principal' WHERE id='00000000-0000-0000-0000-000000000001';

INSERT INTO public.lojas (id, nome, razao_social, cnpj, ativo)
VALUES
  ('00000000-0000-0000-0000-000000000010','Mini Mercado Alpha','Alpha Comércio LTDA','00.000.000/0001-10',true),
  ('00000000-0000-0000-0000-000000000011','Mini Mercado Beta','Beta Comércio LTDA','00.000.000/0001-11',true),
  ('00000000-0000-0000-0000-000000000012','Mini Mercado Gama','Gama Comércio LTDA','00.000.000/0001-12',true)
ON CONFLICT (id) DO NOTHING;

-- 3) Backfill loja_id for existing data to Loja Principal
UPDATE public.clientes       SET loja_id='00000000-0000-0000-0000-000000000001' WHERE loja_id IS NULL;
UPDATE public.transacoes     SET loja_id='00000000-0000-0000-0000-000000000001' WHERE loja_id IS NULL;
UPDATE public.alertas        SET loja_id='00000000-0000-0000-0000-000000000001' WHERE loja_id IS NULL;
UPDATE public.ocorrencias    SET loja_id='00000000-0000-0000-0000-000000000001' WHERE loja_id IS NULL;
UPDATE public.processamentos SET loja_id='00000000-0000-0000-0000-000000000001' WHERE loja_id IS NULL;
UPDATE public.profiles       SET loja_id='00000000-0000-0000-0000-000000000001' WHERE loja_id IS NULL;

-- 4) User roles (separate table — never on profiles)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','manager','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;

CREATE OR REPLACE FUNCTION public.current_loja_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT loja_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- 5) Replace permissive policies with loja-scoped policies (admin bypass)
-- clientes
DROP POLICY IF EXISTS "auth all clientes" ON public.clientes;
CREATE POLICY "loja scoped clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (public.is_admin() OR loja_id = public.current_loja_id())
  WITH CHECK (public.is_admin() OR loja_id = public.current_loja_id());

-- transacoes
DROP POLICY IF EXISTS "auth all transacoes" ON public.transacoes;
CREATE POLICY "loja scoped transacoes" ON public.transacoes
  FOR ALL TO authenticated
  USING (public.is_admin() OR loja_id = public.current_loja_id())
  WITH CHECK (public.is_admin() OR loja_id = public.current_loja_id());

-- alertas
DROP POLICY IF EXISTS "auth all alertas" ON public.alertas;
CREATE POLICY "loja scoped alertas" ON public.alertas
  FOR ALL TO authenticated
  USING (public.is_admin() OR loja_id = public.current_loja_id())
  WITH CHECK (public.is_admin() OR loja_id = public.current_loja_id());

-- ocorrencias
DROP POLICY IF EXISTS "auth all ocorrencias" ON public.ocorrencias;
CREATE POLICY "loja scoped ocorrencias" ON public.ocorrencias
  FOR ALL TO authenticated
  USING (public.is_admin() OR loja_id = public.current_loja_id())
  WITH CHECK (public.is_admin() OR loja_id = public.current_loja_id());

-- processamentos
DROP POLICY IF EXISTS "auth all processamentos" ON public.processamentos;
CREATE POLICY "loja scoped processamentos" ON public.processamentos
  FOR ALL TO authenticated
  USING (public.is_admin() OR loja_id = public.current_loja_id())
  WITH CHECK (public.is_admin() OR loja_id = public.current_loja_id());

-- rating_logs (via cliente)
DROP POLICY IF EXISTS "auth all rating_logs" ON public.rating_logs;
CREATE POLICY "loja scoped rating_logs" ON public.rating_logs
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = rating_logs.cliente_id AND c.loja_id = public.current_loja_id()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = rating_logs.cliente_id AND c.loja_id = public.current_loja_id()
    )
  );

-- profiles — allow self read + admin read all
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "read own profile or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- lojas — everyone authenticated can read; only admin can modify
DROP POLICY IF EXISTS "auth write lojas" ON public.lojas;
CREATE POLICY "admin manage lojas" ON public.lojas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
