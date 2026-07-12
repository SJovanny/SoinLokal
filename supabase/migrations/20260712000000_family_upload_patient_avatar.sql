-- Allow family members (tuteurs) to upload/update/delete avatars
-- for patients they are linked to (via family_links or managed_by)

-- Family can upload avatar for linked patients
CREATE POLICY "Family can upload avatar for linked patients"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      -- Via family_links: tuteur can upload in the patient's folder
      (storage.foldername(name))[1] IN (
        SELECT pf.patient_id::text
        FROM family_links fl
        JOIN patient_files pf ON pf.id = fl.patient_file_id
        WHERE fl.family_user_id = auth.uid()
      )
      OR
      -- Via managed_by: tuteur can upload in the managed patient's folder
      (storage.foldername(name))[1] IN (
        SELECT profile_id::text
        FROM patient_profiles
        WHERE managed_by = auth.uid() AND is_managed = true
      )
    )
  );

-- Family can update avatar for linked patients
CREATE POLICY "Family can update avatar for linked patients"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT pf.patient_id::text
        FROM family_links fl
        JOIN patient_files pf ON pf.id = fl.patient_file_id
        WHERE fl.family_user_id = auth.uid()
      )
      OR
      (storage.foldername(name))[1] IN (
        SELECT profile_id::text
        FROM patient_profiles
        WHERE managed_by = auth.uid() AND is_managed = true
      )
    )
  );

-- Family can delete avatar for linked patients
CREATE POLICY "Family can delete avatar for linked patients"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT pf.patient_id::text
        FROM family_links fl
        JOIN patient_files pf ON pf.id = fl.patient_file_id
        WHERE fl.family_user_id = auth.uid()
      )
      OR
      (storage.foldername(name))[1] IN (
        SELECT profile_id::text
        FROM patient_profiles
        WHERE managed_by = auth.uid() AND is_managed = true
      )
    )
  );

-- Family can update linked/managed patient profiles (full row, Option A)
CREATE POLICY "Family can update linked/managed patient profile"
  ON public.profiles FOR UPDATE
  USING (
    (user_type = 'patient' AND id IN (
      SELECT pf.patient_id FROM family_links fl
      JOIN patient_files pf ON pf.id = fl.patient_file_id
      WHERE fl.family_user_id = auth.uid()
    ))
    OR
    (id IN (
      SELECT profile_id FROM patient_profiles
      WHERE managed_by = auth.uid() AND is_managed = true
    ))
  )
  WITH CHECK (
    (user_type = 'patient' AND id IN (
      SELECT pf.patient_id FROM family_links fl
      JOIN patient_files pf ON pf.id = fl.patient_file_id
      WHERE fl.family_user_id = auth.uid()
    ))
    OR
    (id IN (
      SELECT profile_id FROM patient_profiles
      WHERE managed_by = auth.uid() AND is_managed = true
    ))
  );
