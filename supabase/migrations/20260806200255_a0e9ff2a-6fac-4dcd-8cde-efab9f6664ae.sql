-- Fase 0 "Blindagem" — Correção C2
-- Problema: todo novo cadastro herdava automaticamente loja_id = 'Loja Principal',
-- e user_has_loja() aceitava profiles.loja_id como segunda porta de entrada além de
-- user_lojas, permitindo acesso indevido caso o profile fosse manipulado diretamente.

-- 1) Novos usuários passam a nascer SEM loja vinculada (loja_id = NULL).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, loja_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NULL);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- 2) Backfill defensivo
INSERT INTO public.user_lojas (user_id, loja_id)
SELECT p.id, p.loja_id
FROM public.profiles p
WHERE p.loja_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) user_lojas passa a ser a ÚNICA fonte de verdade
CREATE OR REPLACE FUNCTION public.user_has_loja(_user_id uuid, _loja_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _loja_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_lojas WHERE user_id = _user_id AND loja_id = _loja_id
  );
$$;