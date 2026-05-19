-- 021_storage.sql: Storage buckets + RLS
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES
  ('evidence','evidence',false,52428800,ARRAY['application/pdf','image/png','image/jpeg','application/json','text/csv']),
  ('reports','reports',false,104857600,ARRAY['application/pdf']),
  ('avatars','avatars',true,2097152,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "evidence_org_read" ON storage.objects FOR SELECT USING (bucket_id='evidence' AND (storage.foldername(name))[1]=public.get_my_org_id()::text);
CREATE POLICY "evidence_org_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id='evidence' AND (storage.foldername(name))[1]=public.get_my_org_id()::text);
CREATE POLICY "evidence_org_delete" ON storage.objects FOR DELETE USING (bucket_id='evidence' AND (storage.foldername(name))[1]=public.get_my_org_id()::text AND public.get_my_role() IN ('admin','ciso'));
CREATE POLICY "reports_org_read" ON storage.objects FOR SELECT USING (bucket_id='reports' AND (storage.foldername(name))[1]=public.get_my_org_id()::text);
CREATE POLICY "reports_org_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id='reports' AND (storage.foldername(name))[1]=public.get_my_org_id()::text AND public.get_my_role() IN ('admin','ciso'));
CREATE POLICY "avatars_own_read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "avatars_own_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "avatars_own_update" ON storage.objects FOR UPDATE USING (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
