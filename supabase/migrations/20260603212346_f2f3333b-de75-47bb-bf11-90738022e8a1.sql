
CREATE POLICY "auth upload excel" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'excel-uploads');
CREATE POLICY "auth read excel" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'excel-uploads');
CREATE POLICY "auth update excel" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'excel-uploads');
CREATE POLICY "auth delete excel" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'excel-uploads');
