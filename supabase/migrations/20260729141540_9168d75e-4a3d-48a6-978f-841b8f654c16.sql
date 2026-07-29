INSERT INTO public.lojas (nome, ativo) VALUES
  ('Leonardi Construção Industrializada Ltda', true),
  ('Lar Plasticos Indústria e Com. de Produtos Ltda', true),
  ('My Helbor', true),
  ('POINT VILA YARA', true),
  ('CONDOMINIO BELA VISTA', true),
  ('Condomínio Superquadra Brasília SQB', true),
  ('Magazine Luiza - CD300', true),
  ('Associação Anhanguera Parque Empresarial', true)
ON CONFLICT DO NOTHING;