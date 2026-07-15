-- Allow admins to upload verification documents on behalf of nurses
-- so they can complete dossiers stuck in 'pending_docs' status.

CREATE POLICY "Admin uploads verification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'nurse-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admin deletes verification documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'nurse-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
