-- Fix infinite recursion in profiles RLS policies.
-- The ENUM migration recreated policies that query patient_files/patient_profiles,
-- which themselves have RLS policies referencing profiles, causing 42P17.
-- Solution: use SECURITY DEFINER helper functions that bypass RLS.

-- ---------------------------------------------------------------------------
-- 1. SECURITY DEFINER helper functions
-- ---------------------------------------------------------------------------

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

-- Check if current user is admin (bypasses RLS on profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$;

-- ---------------------------------------------------------------------------
-- 2. Drop and recreate policies using the helpers
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Family views linked patient profiles" ON public.profiles;
CREATE POLICY "Family views linked patient profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND id IN (SELECT public.get_family_linked_patient_ids())
  );

DROP POLICY IF EXISTS "Family views managed patient base profiles" ON public.profiles;
CREATE POLICY "Family views managed patient base profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND id IN (SELECT public.get_family_managed_patient_ids())
  );

DROP POLICY IF EXISTS "Family views linked nurse base profiles" ON public.profiles;
CREATE POLICY "Family views linked nurse base profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'nurse'
    AND id IN (SELECT public.get_family_nurse_ids())
  );

DROP POLICY IF EXISTS "Nurses can view family profiles of their patients" ON public.profiles;
CREATE POLICY "Nurses can view family profiles of their patients" ON public.profiles
  FOR SELECT USING (
    user_type = 'family'
    AND id IN (SELECT public.get_nurse_family_ids())
  );

DROP POLICY IF EXISTS "Patients can view linked nurse profiles" ON public.profiles;
CREATE POLICY "Patients can view linked nurse profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'nurse'
    AND id IN (SELECT nurse_id FROM public.patient_files WHERE patient_id = auth.uid())
  );

DROP POLICY IF EXISTS "Nurses can view patient profiles" ON public.profiles;
CREATE POLICY "Nurses can view patient profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND id IN (SELECT public.get_nurse_patient_profile_ids())
  );

DROP POLICY IF EXISTS "Family can update linked/managed patient profile" ON public.profiles;
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

-- Fix Admin policies (were self-referencing profiles causing recursion)
DROP POLICY IF EXISTS "Admin views all profiles" ON public.profiles;
CREATE POLICY "Admin views all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin updates all profiles" ON public.profiles;
CREATE POLICY "Admin updates all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());