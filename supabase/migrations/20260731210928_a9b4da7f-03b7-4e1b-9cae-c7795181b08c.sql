DROP POLICY IF EXISTS "loja scoped smart buckets read" ON storage.objects;
CREATE POLICY "loja scoped smart buckets read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('ocorrencias','relatorios','pdfs','thumbnails')
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid))
);

DROP POLICY IF EXISTS "loja scoped smart buckets insert" ON storage.objects;
CREATE POLICY "loja scoped smart buckets insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('ocorrencias','relatorios','pdfs','thumbnails')
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid))
);

DROP POLICY IF EXISTS "loja scoped smart buckets update" ON storage.objects;
CREATE POLICY "loja scoped smart buckets update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('ocorrencias','relatorios','pdfs','thumbnails')
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid))
)
WITH CHECK (
  bucket_id IN ('ocorrencias','relatorios','pdfs','thumbnails')
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid))
);

DROP POLICY IF EXISTS "loja scoped smart buckets delete" ON storage.objects;
CREATE POLICY "loja scoped smart buckets delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('ocorrencias','relatorios','pdfs','thumbnails')
  AND (public.is_admin() OR public.user_has_loja(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid))
);