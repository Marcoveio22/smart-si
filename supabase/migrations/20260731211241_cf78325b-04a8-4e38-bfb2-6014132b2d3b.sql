GRANT EXECUTE ON FUNCTION public.faturamento_por_mes(uuid, timestamptz, timestamptz) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.dashboard_horarios(uuid, timestamptz, timestamptz) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.faturamento_total(uuid, timestamptz, timestamptz) TO service_role, postgres;