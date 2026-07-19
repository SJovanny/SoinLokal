-- Fix infinite recursion (42P17) introduced by 20260718000000_fix_nurse_patient_search.sql.
-- That migration's "Nurses can view patient profiles" policy queried
-- nurse_profiles directly via EXISTS(...), but nurse_profiles has its own
-- RLS policies that reference profiles, creating a circular dependency.
-- Solution (same pattern as 20260715223622_fix_profiles_rls_recursion.sql):
-- use a SECURITY DEFINER helper function that bypasses RLS.

CREATE OR REPLACE FUNCTION public.is_nurse()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nurse_profiles WHERE profile_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Nurses can view patient profiles" ON public.profiles;
CREATE POLICY "Nurses can view patient profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND public.is_nurse()
  );
