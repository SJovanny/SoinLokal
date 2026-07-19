-- Fix regression introduced by 20260715223622_fix_profiles_rls_recursion.sql:
-- nurses could only see patient profiles already linked in patient_files,
-- making it impossible to search for and add NEW patients (chicken-and-egg
-- problem: you need to already have added a patient to be able to see it).
--
-- Restore the original "discovery" behaviour: any nurse can see any patient
-- profile, so they can find and add patients to their list.
--
-- Also add a privacy-safe helper so the search UI can flag patients that are
-- already followed by ANOTHER nurse, without ever exposing which nurse.

-- ---------------------------------------------------------------------------
-- 1. Restore broad patient visibility for nurses (search/discovery)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Nurses can view patient profiles" ON public.profiles;
CREATE POLICY "Nurses can view patient profiles" ON public.profiles
  FOR SELECT USING (
    user_type = 'patient'
    AND EXISTS (
      SELECT 1 FROM public.nurse_profiles np WHERE np.profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Privacy-safe helper: which patients (from a given list) are already
--    followed by a DIFFERENT active nurse. Returns only patient ids, never
--    the other nurse's identity.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_assigned_patient_ids(patient_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pf.patient_id
  FROM public.patient_files pf
  WHERE pf.patient_id = ANY(patient_ids)
    AND pf.is_active = true
    AND pf.nurse_id <> auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_patient_ids(uuid[]) TO authenticated;
