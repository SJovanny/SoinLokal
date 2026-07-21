-- Open read access for all nurses to all patient_files and appointments.
-- Nurses can see everything (read-only for others' data).
-- Write access remains restricted to own records.

-- 1. patient_files: open SELECT for all nurses
drop policy if exists "Nurse views own patient files" on public.patient_files;

create policy "Nurse views all patient files" on public.patient_files
  for select using (
    exists (select 1 from public.nurse_profiles where profile_id = auth.uid())
  );

-- 2. appointments: open SELECT for all nurses
drop policy if exists "Nurse views patient appointments" on public.appointments;

create policy "Nurse views all appointments" on public.appointments
  for select using (
    exists (select 1 from public.nurse_profiles where profile_id = auth.uid())
  );
