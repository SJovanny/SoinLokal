-- ==============================================================================
-- Migration: Family role RLS policies
-- Allows family members to view linked patient data and communicate with care team
-- ==============================================================================

-- Family can view the profiles of patients they are linked to
drop policy if exists "Family views linked patient profiles" on public.profiles;
create policy "Family views linked patient profiles" on public.profiles
  for select using (
    user_type = 'patient'
    and id in (
      select pf.patient_id from public.patient_files pf
      inner join public.family_links fl on fl.patient_file_id = pf.id
      where fl.family_user_id = auth.uid()
    )
  );

-- Family can view patient_profiles of linked patients
drop policy if exists "Family views linked patient details" on public.patient_profiles;
create policy "Family views linked patient details" on public.patient_profiles
  for select using (
    profile_id in (
      select pf.patient_id from public.patient_files pf
      inner join public.family_links fl on fl.patient_file_id = pf.id
      where fl.family_user_id = auth.uid()
    )
  );

-- Family can view nurse profiles of nurses linked to their patient files
drop policy if exists "Family views linked nurse profiles" on public.nurse_profiles;
create policy "Family views linked nurse profiles" on public.nurse_profiles
  for select using (
    profile_id in (
      select pf.nurse_id from public.patient_files pf
      inner join public.family_links fl on fl.patient_file_id = pf.id
      where fl.family_user_id = auth.uid()
    )
  );

-- Family can view appointments for linked patient files
drop policy if exists "Family views linked appointments" on public.appointments;
create policy "Family views linked appointments" on public.appointments
  for select using (
    patient_file_id in (
      select patient_file_id from public.family_links
      where family_user_id = auth.uid()
    )
  );

-- Family can view messages for linked patient files
drop policy if exists "Family views linked messages" on public.messages;
create policy "Family views linked messages" on public.messages
  for select using (
    patient_file_id in (
      select patient_file_id from public.family_links
      where family_user_id = auth.uid()
    )
  );

-- Family can send messages in linked patient files (only if can_message permission)
drop policy if exists "Family sends messages" on public.messages;
create policy "Family sends messages" on public.messages
  for insert with check (
    author_id = auth.uid()
    and patient_file_id in (
      select patient_file_id from public.family_links
      where family_user_id = auth.uid()
      and permissions = 'can_message'
    )
  );

-- ==============================================================================
-- Managed patients: family can view appointments and messages
-- for patients they manage (managed_by)
-- ==============================================================================

-- Family can view appointments for managed patients
drop policy if exists "Family views managed appointments" on public.appointments;
create policy "Family views managed appointments" on public.appointments
  for select using (
    patient_file_id in (
      select pf.id from public.patient_files pf
      inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
      where pp.managed_by = auth.uid()
    )
  );

-- Family can view messages for managed patients
drop policy if exists "Family views managed messages" on public.messages;
create policy "Family views managed messages" on public.messages
  for select using (
    patient_file_id in (
      select pf.id from public.patient_files pf
      inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
      where pp.managed_by = auth.uid()
    )
  );

-- Family can send messages for managed patients
drop policy if exists "Family sends managed messages" on public.messages;
create policy "Family sends managed messages" on public.messages
  for insert with check (
    author_id = auth.uid()
    and patient_file_id in (
      select pf.id from public.patient_files pf
      inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
      where pp.managed_by = auth.uid()
    )
  );

-- ==============================================================================
-- Managed patients: family can view patients they manage (managed_by)
-- These patients may not have a patient_file yet (no nurse assigned)
-- ==============================================================================

-- Family can view managed patient base profiles
drop policy if exists "Family views managed patient base profiles" on public.profiles;
create policy "Family views managed patient base profiles" on public.profiles
  for select using (
    user_type = 'patient'
    and id in (
      select profile_id from public.patient_profiles
      where managed_by = auth.uid()
    )
  );

-- Family can view nurse profiles of nurses linked to their patients
drop policy if exists "Family views linked nurse base profiles" on public.profiles;
create policy "Family views linked nurse base profiles" on public.profiles
  for select using (
    user_type = 'nurse'
    and id in (
      select pf.nurse_id from public.patient_files pf
      where pf.patient_id in (
        select pf2.patient_id from public.patient_files pf2
        inner join public.family_links fl on fl.patient_file_id = pf2.id
        where fl.family_user_id = auth.uid()
        union
        select profile_id from public.patient_profiles
        where managed_by = auth.uid()
      )
    )
  );

-- Nurses can view family profiles of patients they care for
drop policy if exists "Nurses can view family profiles of their patients" on public.profiles;
create policy "Nurses can view family profiles of their patients" on public.profiles
  for select using (
    user_type = 'family'
    and id in (
      select pp.managed_by from public.patient_profiles pp
      inner join public.patient_files pf on pf.patient_id = pp.profile_id
      where pf.nurse_id = auth.uid()
      and pp.managed_by is not null
    )
  );

-- Family can view managed patient_profiles
drop policy if exists "Family views managed patient details" on public.patient_profiles;
create policy "Family views managed patient details" on public.patient_profiles
  for select using ( managed_by = auth.uid() );

-- Helper function: returns patient profile IDs managed by the current user
-- SECURITY DEFINER bypasses RLS to avoid infinite recursion
create or replace function public.get_managed_patient_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select profile_id from public.patient_profiles
  where managed_by = auth.uid();
$$;

-- Family can view patient_files of managed patients (needed to show assigned nurse)
drop policy if exists "Family views managed patient files" on public.patient_files;
create policy "Family views managed patient files" on public.patient_files
  for select using (
    patient_id in (select public.get_managed_patient_ids())
  );
