
-- Promote the sole existing user to admin so bootstrap works and RLS on processamentos passes.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Defensive default so inserts without an explicit loja_id inherit the user's loja.
ALTER TABLE public.processamentos ALTER COLUMN loja_id SET DEFAULT public.current_loja_id();
