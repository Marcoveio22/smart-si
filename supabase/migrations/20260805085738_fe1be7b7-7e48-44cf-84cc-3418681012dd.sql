-- 1) Fixed search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 2) Revoke anon EXECUTE on all public functions; trigger-only helpers revoked entirely
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS f FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.f);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- 3) lojas: only associated lojas (admins see all)
DROP POLICY IF EXISTS "auth read lojas" ON public.lojas;
CREATE POLICY "auth read own lojas" ON public.lojas FOR SELECT TO authenticated
USING (public.is_admin() OR public.user_has_loja(auth.uid(), id));

-- 4) excel-uploads: owner folder, or processamento of an accessible loja, or admin
DROP POLICY IF EXISTS "auth upload excel" ON storage.objects;
DROP POLICY IF EXISTS "auth read excel" ON storage.objects;
DROP POLICY IF EXISTS "auth update excel" ON storage.objects;
DROP POLICY IF EXISTS "auth delete excel" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_access_excel_object(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
      OR (storage.foldername(_name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.processamentos p
         WHERE p.id::text = (storage.foldername(_name))[1]
           AND (p.created_by = auth.uid() OR public.user_has_loja(auth.uid(), p.loja_id))
      );
$$;
REVOKE ALL ON FUNCTION public.can_access_excel_object(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_excel_object(text) TO authenticated, service_role;

CREATE POLICY "excel scoped read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'excel-uploads' AND public.can_access_excel_object(name));
CREATE POLICY "excel scoped insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'excel-uploads' AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "excel scoped update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'excel-uploads' AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text))
WITH CHECK (bucket_id = 'excel-uploads' AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "excel scoped delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'excel-uploads' AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text));

-- 5) Existing loja-scoped bucket policies: authenticated only (anon can no longer run the helpers)
DROP POLICY IF EXISTS "loja scoped smart buckets read" ON storage.objects;
DROP POLICY IF EXISTS "loja scoped smart buckets insert" ON storage.objects;
DROP POLICY IF EXISTS "loja scoped smart buckets update" ON storage.objects;
DROP POLICY IF EXISTS "loja scoped smart buckets delete" ON storage.objects;

CREATE POLICY "loja scoped smart buckets read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = ANY (ARRAY['ocorrencias','relatorios','pdfs','thumbnails'])
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)));
CREATE POLICY "loja scoped smart buckets insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = ANY (ARRAY['ocorrencias','relatorios','pdfs','thumbnails'])
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)));
CREATE POLICY "loja scoped smart buckets update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = ANY (ARRAY['ocorrencias','relatorios','pdfs','thumbnails'])
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)))
WITH CHECK (bucket_id = ANY (ARRAY['ocorrencias','relatorios','pdfs','thumbnails'])
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)));
CREATE POLICY "loja scoped smart buckets delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = ANY (ARRAY['ocorrencias','relatorios','pdfs','thumbnails'])
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)));