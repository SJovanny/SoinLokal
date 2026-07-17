-- Convert user_type column from text to a proper PostgreSQL ENUM type.
-- This makes user_type selectable and enforces valid values at the database level.

-- 1. Create the ENUM type
CREATE TYPE public.user_type_enum AS ENUM ('admin', 'nurse', 'patient', 'family');

-- 2. Drop the CHECK constraint added by the previous migration
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- 3. Drop all policies that reference user_type so we can alter the column type
DROP POLICY IF EXISTS "Family views linked patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Family views managed patient base profiles" ON public.profiles;
DROP POLICY IF EXISTS "Family views linked nurse base profiles" ON public.profiles;
DROP POLICY IF EXISTS "Nurses can view family profiles of their patients" ON public.profiles;
DROP POLICY IF EXISTS "Patients can view linked nurse profiles" ON public.profiles;
DROP POLICY IF EXISTS "Nurses can view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Family can update linked/managed patient profile" ON public.profiles;

-- 4. Alter the column to use the new ENUM type
ALTER TABLE public.profiles
  ALTER COLUMN user_type TYPE public.user_type_enum
  USING user_type::public.user_type_enum;

-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER helper functions (break RLS recursion cycles)
-- ---------------------------------------------------------------------------

-- Already exists from 20260710121000, but ensure it's up to date
CREATE OR REPLACE FUNCTION public.get_managed_nurse_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pf.nurse_id
  FROM public.patient_files pf
  INNER JOIN public.patient_profiles pp ON pp.profile_id = pf.patient_id
  WHERE pp.managed_by = auth.uid();
$$;

-- Nurse's own patient profile IDs (via patient_files)
CREATE OR REPLACE FUNCTION public.get_nurse_patient_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pf.patient_id
  FROM public.patient_files pf
  WHERE pf.nurse_id = auth.uid();
$$;

-- Family-linked patient profile IDs (via family_links -> patient_files)
CREATE OR REPLACE FUNCTION public.get_family_linked_patient_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pf.patient_id
  FROM public.patient_files pf
  INNER JOIN public.family_links fl ON fl.patient_file_id = pf.id
  WHERE fl.family_user_id = auth.uid();
$$;

-- Family-managed patient profile IDs (via patient_profiles.managed_by)
CREATE OR REPLACE FUNCTION public.get_family_managed_patient_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pp.profile_id
  FROM public.patient_profiles pp
  WHERE pp.managed_by = auth.uid();
$$;

-- Nurse IDs linked to family's patients (union of linked + managed)
CREATE OR REPLACE FUNCTION public.get_family_nurse_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pf.nurse_id
  FROM public.patient_files pf
  WHERE pf.patient_id IN (
    SELECT public.get_family_linked_patient_ids()
    UNION
    SELECT public.get_family_managed_patient_ids()
  );
$$;

-- Family user IDs (managed_by) of patients a nurse cares for
CREATE OR REPLACE FUNCTION public.get_nurse_family_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pp.managed_by
  FROM public.patient_profiles pp
  INNER JOIN public.patient_files pf ON pf.patient_id = pp.profile_id
  WHERE pf.nurse_id = auth.uid()
  AND pp.managed_by IS NOT NULL;
$$;

-- ---------------------------------------------------------------------------
-- 6. Recreate all policies using SECURITY DEFINER helpers
-- ---------------------------------------------------------------------------

-- Family can view the profiles of patients they are linked to
CREATE POLICY "Family views linked patient profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND id IN (SELECT public.get_family_linked_patient_ids())
  );

-- Family can view managed patient base profiles
CREATE POLICY "Family views managed patient base profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND id IN (SELECT public.get_family_managed_patient_ids())
  );

-- Family can view nurse profiles of nurses linked to their patients
CREATE POLICY "Family views linked nurse base profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'nurse'
    AND id IN (SELECT public.get_family_nurse_ids())
  );

-- Nurses can view family profiles of patients they care for
CREATE POLICY "Nurses can view family profiles of their patients" ON public.profiles
  FOR SELECT USING (
    user_type = 'family'
    AND id IN (SELECT public.get_nurse_family_ids())
  );

-- Patients can view base profiles of nurses linked to their patient_files
CREATE POLICY "Patients can view linked nurse profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'nurse'
    AND id IN (
      SELECT nurse_id FROM public.patient_files
      WHERE patient_id = auth.uid()
    )
  );

-- Nurses can view patient profiles linked to their patient_files
CREATE POLICY "Nurses can view patient profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND id IN (SELECT public.get_nurse_patient_profile_ids())
  );

-- Family can update linked/managed patient profile
CREATE POLICY "Family can update linked/managed patient profile"
  ON public.profiles FOR UPDATE
  USING (
    (user_type = 'patient' AND id IN (SELECT public.get_family_linked_patient_ids()))
    OR
    (id IN (SELECT public.get_family_managed_patient_ids()))
  )
  WITH CHECK (
    (user_type = 'patient' AND id IN (SELECT public.get_family_linked_patient_ids()))
    OR
    (id IN (SELECT public.get_family_managed_patient_ids()))
  );