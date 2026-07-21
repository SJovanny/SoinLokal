-- Update RLS policies on appointments so nurses can see ALL appointments
-- for patients they have an active file with (not just their own).
-- Nurses can only INSERT/UPDATE/DELETE their own appointments.

-- Drop old combined policy
drop policy if exists "Nurse manages appointments" on public.appointments;

-- SELECT: nurse can see ALL appointments for patients they have an active file with
create policy "Nurse views patient appointments" on public.appointments
  for select using (
    exists (
      select 1 from public.patient_files pf
      where pf.patient_id = (
        select pf2.patient_id from public.patient_files pf2
        where pf2.id = patient_file_id
      )
      and pf.nurse_id = auth.uid()
      and pf.is_active = true
    )
  );

-- INSERT: nurse can only create in their own files
create policy "Nurse creates appointments" on public.appointments
  for insert with check (
    nurse_id = auth.uid()
    and exists (
      select 1 from public.patient_files
      where id = patient_file_id and nurse_id = auth.uid()
    )
  );

-- UPDATE: nurse can only update their own appointments
create policy "Nurse updates own appointments" on public.appointments
  for update using ( nurse_id = auth.uid() )
  with check ( nurse_id = auth.uid() );

-- DELETE: nurse can only delete their own appointments
create policy "Nurse deletes own appointments" on public.appointments
  for delete using ( nurse_id = auth.uid() );
