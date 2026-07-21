-- Widen nurse read access:
-- 1. Any nurse can view any other nurse's base profile (needed to resolve
--    nurse:profiles!nurse_id(...) joins in appointments/care history, so
--    every nurse can see who performed a given soin, not just their own).
-- 2. Any nurse can view ALL patient_files rows (not just their own or
--    "shared" ones) so care history for ANY patient is visible without
--    first adding that patient to their own list. This reverts the
--    "own or shared" scoping introduced in
--    20260721050000_fix_patient_files_shared_access_no_recursion.sql per
--    updated product requirement: all nurses should see all nurses' care.

-- 1. profiles: nurse -> nurse visibility
create policy "Nurses can view other nurse profiles" on public.profiles
  for select using (
    user_type = 'nurse' and public.is_nurse()
  );

-- 2. patient_files: fully open SELECT for all nurses
drop policy if exists "Nurse views own or shared patient files" on public.patient_files;

create policy "Nurse views all patient files" on public.patient_files
  for select using (
    exists (select 1 from public.nurse_profiles where profile_id = auth.uid())
  );
