-- FIX: Remove recursive patient_files policy and use SECURITY DEFINER function instead
-- for the cross-nurse appointments visibility.

-- 1. Drop the recursive policy
drop policy if exists "Nurse views shared patient files" on public.patient_files;

-- 2. Create a SECURITY DEFINER function to break the recursion
-- This function looks up patient_id from a patient_file_id bypassing RLS.
create or replace function public.get_patient_id_from_file(file_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select patient_id from public.patient_files where id = file_id;
$$;

-- 3. Drop old appointments policies
drop policy if exists "Nurse views patient appointments" on public.appointments;
drop policy if exists "Nurse creates appointments" on public.appointments;
drop policy if exists "Nurse updates own appointments" on public.appointments;
drop policy if exists "Nurse deletes own appointments" on public.appointments;

-- 4. Recreate appointments policies using the SECURITY DEFINER function
-- SELECT: nurse can see ALL appointments for patients they have an active file with
create policy "Nurse views patient appointments" on public.appointments
  for select using (
    exists (
      select 1 from public.patient_files pf
      where pf.patient_id = public.get_patient_id_from_file(appointments.patient_file_id)
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
