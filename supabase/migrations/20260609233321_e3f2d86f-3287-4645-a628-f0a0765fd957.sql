
UPDATE public.transacoes SET valor = valor / 100 WHERE valor IS NOT NULL;
UPDATE public.clientes SET total_gasto = total_gasto / 100 WHERE total_gasto IS NOT NULL;
UPDATE public.processamentos SET faturamento_total = faturamento_total / 100 WHERE faturamento_total IS NOT NULL;
