DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS f, p.proname FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.f);
    IF r.proname IN (
      'is_admin','has_role','user_has_loja','current_loja_id','admin_set_user_lojas',
      'bootstrap_admin_self','faturamento_total','faturamento_por_mes','dashboard_horarios',
      'can_access_excel_object'
    ) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.f);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.f);
    END IF;
  END LOOP;
END $$;