
-- Ensure handle_new_user assigns Loja Principal + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, loja_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
          '00000000-0000-0000-0000-000000000001');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Give existing users the default role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- Bootstrap: allow the very first authenticated caller to become admin
-- when no admin exists yet (used by the app during first-run setup).
CREATE OR REPLACE FUNCTION public.bootstrap_admin_self()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_admin boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') INTO has_admin;
  IF has_admin THEN RETURN false; END IF;
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;
