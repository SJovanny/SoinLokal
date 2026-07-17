-- RPPS verification for nurses + minimal admin back-office
-- ADELI has been replaced by RPPS (11 digits) for nurses since Oct 2021.
-- This migration adds verification tracking columns, a manual-review queue
-- table, an admin flag on profiles, and a private storage bucket for
-- verification documents (justificatifs).

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. nurse_profiles: verification tracking columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.nurse_profiles
  ADD COLUMN IF NOT EXISTS verification_status text
    CHECK (verification_status IN ('pending', 'verified', 'manual_review', 'rejected'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rpps_api_payload jsonb;

-- ---------------------------------------------------------------------------
-- 2. profiles: admin flag
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. Manual review queue table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nurse_verification_requests (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_path text,
  status        text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  notes         text,
  reviewed_by   uuid REFERENCES public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at    timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.nurse_verification_requests ENABLE ROW LEVEL SECURITY;

-- Nurse can view/create/update their own request
DROP POLICY IF EXISTS "Nurse views own verification request" ON public.nurse_verification_requests;
CREATE POLICY "Nurse views own verification request" ON public.nurse_verification_requests
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Nurse creates own verification request" ON public.nurse_verification_requests;
CREATE POLICY "Nurse creates own verification request" ON public.nurse_verification_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Nurse updates own verification request" ON public.nurse_verification_requests;
CREATE POLICY "Nurse updates own verification request" ON public.nurse_verification_requests
  FOR UPDATE USING (profile_id = auth.uid() AND status = 'pending');

-- Admin can view/update all requests
DROP POLICY IF EXISTS "Admin views all verification requests" ON public.nurse_verification_requests;
CREATE POLICY "Admin views all verification requests" ON public.nurse_verification_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin updates all verification requests" ON public.nurse_verification_requests;
CREATE POLICY "Admin updates all verification requests" ON public.nurse_verification_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP TRIGGER IF EXISTS handle_updated_at ON public.nurse_verification_requests;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.nurse_verification_requests
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime (updated_at);

-- ---------------------------------------------------------------------------
-- 4. Admin can view/update all profiles + nurse_profiles (for the review flow)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admin views all profiles" ON public.profiles;
CREATE POLICY "Admin views all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "Admin updates all profiles" ON public.profiles;
CREATE POLICY "Admin updates all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "Admin views all nurse profiles" ON public.nurse_profiles;
CREATE POLICY "Admin views all nurse profiles" ON public.nurse_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin updates all nurse profiles" ON public.nurse_profiles;
CREATE POLICY "Admin updates all nurse profiles" ON public.nurse_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ---------------------------------------------------------------------------
-- 5. Private storage bucket for verification documents
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('nurse-documents', 'nurse-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Nurse can upload/read/update/delete in their own folder (auth.uid() prefix)
CREATE POLICY "Nurse manages own verification documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'nurse-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'nurse-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin can read all verification documents
CREATE POLICY "Admin reads all verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'nurse-documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ---------------------------------------------------------------------------
-- 6. Update handle_new_user trigger to read rpps_number / verification_status
--    from raw_user_meta_data (adeli kept for backward-compat / other professions)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_type text;
BEGIN
  v_user_type := new.raw_user_meta_data->>'user_type';

  -- Insert base profile
  INSERT INTO public.profiles (
    id, email, first_name, last_name, user_type, phone, verified
  ) VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    v_user_type,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'verified')::boolean, false)
  );

  -- Insert role-specific profile
  IF v_user_type = 'nurse' THEN
    INSERT INTO public.nurse_profiles (
      profile_id, adeli, rpps_number, verification_status, specialties, zone, address, gps_lat, gps_lng
    ) VALUES (
      new.id,
      new.raw_user_meta_data->>'adeli',
      new.raw_user_meta_data->>'rpps_number',
      coalesce(new.raw_user_meta_data->>'verification_status', 'pending'),
      CASE
        WHEN jsonb_typeof(new.raw_user_meta_data->'specialties') = 'array'
        THEN array(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'specialties'))
        ELSE null
      END,
      new.raw_user_meta_data->>'zone',
      new.raw_user_meta_data->>'address',
      (new.raw_user_meta_data->>'gps_lat')::double precision,
      (new.raw_user_meta_data->>'gps_lng')::double precision
    );
  ELSIF v_user_type = 'patient' THEN
    INSERT INTO public.patient_profiles (
      profile_id, address, emergency_contact
    ) VALUES (
      new.id,
      new.raw_user_meta_data->>'address',
      new.raw_user_meta_data->>'emergency_contact'
    );
  END IF;

  RETURN new;
END;
$$;
