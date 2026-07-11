-- ==============================================================================
-- Migration: Patients can view nurse profiles
-- Allows patients to see nurse professional info (adeli, zone, phone, etc.)
-- when clicking on nurse name in chat or viewing nurse profile
-- ==============================================================================

-- Patients can view base profiles of nurses linked to their patient_files
drop policy if exists "Patients can view linked nurse profiles" on public.profiles;
create policy "Patients can view linked nurse profiles" on public.profiles
  for select using (
    user_type = 'nurse'
    and id in (
      select nurse_id from public.patient_files
      where patient_id = auth.uid()
    )
  );

-- Patients can view nurse_profiles of nurses linked to their patient_files
drop policy if exists "Patients can view linked nurse details" on public.nurse_profiles;
create policy "Patients can view linked nurse details" on public.nurse_profiles
  for select using (
    profile_id in (
      select nurse_id from public.patient_files
      where patient_id = auth.uid()
    )
  );
