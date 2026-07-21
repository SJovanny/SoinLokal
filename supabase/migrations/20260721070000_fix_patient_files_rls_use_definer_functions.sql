-- Fix: break infinite RLS recursion (42P17) between patient_files ↔ nurse_profiles
-- introduced by 20260721060000.
--
-- Cycle identified:
--   patient_files ("Nurse views all patient files")
--     → nurse_profiles (EXISTS direct, non-SECURITY DEFINER)
--       → policy "Patients can view linked nurse details"
--         → patient_files (SELECT direct) → 42P17
--
-- Fix A (critical): replace the direct EXISTS on nurse_profiles in the
--   patient_files policy with public.is_nurse() which is already SECURITY
--   DEFINER, breaking the cycle at the entry point.
--
-- Fix B (preventive): convert the two nurse_profiles policies that still
--   contain direct references to patient_files / family_links into
--   SECURITY DEFINER function calls, preventing any future cycle through
--   nurse_profiles.

-- =========================================================================
-- FIX A — patient_files : use SECURITY DEFINER function instead of direct
-- EXISTS on nurse_profiles
-- =========================================================================

drop policy if exists "Nurse views all patient files" on public.patient_files;

create policy "Nurse views all patient files" on public.patient_files
  for select using (
    public.is_nurse()  -- SECURITY DEFINER → bypasses RLS on nurse_profiles, breaks cycle
  );

-- =========================================================================
-- FIX B — nurse_profiles : convert direct references to SECURITY DEFINER
-- =========================================================================

-- B1. Patients can view linked nurse details
-- Current policy (20260710000000): direct SELECT on patient_files → cycle risk
-- New: via SECURITY DEFINER function get_patient_nurse_ids()

create or replace function public.get_patient_nurse_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select distinct nurse_id from public.patient_files where patient_id = auth.uid();
$$;

grant execute on function public.get_patient_nurse_ids() to authenticated;

drop policy if exists "Patients can view linked nurse details" on public.nurse_profiles;

create policy "Patients can view linked nurse details" on public.nurse_profiles
  for select using (
    profile_id in (select public.get_patient_nurse_ids())
  );

-- B2. Family views linked nurse profiles
-- Current policy (20260706140500): direct SELECT on patient_files + family_links
-- New: via SECURITY DEFINER function get_family_linked_nurse_ids()

create or replace function public.get_family_linked_nurse_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select distinct pf.nurse_id
  from public.patient_files pf
  inner join public.family_links fl on fl.patient_file_id = pf.id
  where fl.family_user_id = auth.uid();
$$;

grant execute on function public.get_family_linked_nurse_ids() to authenticated;

drop policy if exists "Family views linked nurse profiles" on public.nurse_profiles;

create policy "Family views linked nurse profiles" on public.nurse_profiles
  for select using (
    profile_id in (select public.get_family_linked_nurse_ids())
  );
