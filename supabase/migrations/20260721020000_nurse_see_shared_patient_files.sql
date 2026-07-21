-- Allow nurses to see other nurses' patient_files for shared patients.
-- This is needed so the appointments cross-nurse SELECT policy can resolve
-- patient_id via subqueries on patient_files.

-- Drop old policy that only allowed seeing own files
drop policy if exists "Nurse views own patient files" on public.patient_files;

-- Nurses can always see their own files
create policy "Nurse views own patient files" on public.patient_files
  for select using ( nurse_id = auth.uid() );

-- Nurses can also see other nurses' files for patients they share
create policy "Nurse views shared patient files" on public.patient_files
  for select using (
    exists (
      select 1 from public.patient_files pf
      where pf.patient_id = patient_files.patient_id
      and pf.nurse_id = auth.uid()
      and pf.is_active = true
    )
  );
