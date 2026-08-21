INSERT INTO public.lojas (nome, ativo)
SELECT 'SPAZIO JARDIM IMPERIAL', true
WHERE NOT EXISTS (SELECT 1 FROM public.lojas WHERE nome = 'SPAZIO JARDIM IMPERIAL');

INSERT INTO public.user_lojas (user_id, loja_id)
SELECT r.user_id, l.id
FROM public.user_roles r
CROSS JOIN public.lojas l
WHERE r.role = 'admin' AND l.nome = 'SPAZIO JARDIM IMPERIAL'
ON CONFLICT DO NOTHING;