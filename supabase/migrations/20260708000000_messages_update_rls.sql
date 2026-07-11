-- ==============================================================================
-- Migration: Missing UPDATE RLS policies on public.messages
-- Without these, `update messages set is_read = true ...` silently affects
-- 0 rows (RLS default-deny with no matching policy, no thrown error), so
-- messages are never actually marked as read and the unread badge never
-- clears. These policies mirror the existing SELECT policies for each
-- participant type (direct nurse/patient, linked family, managed-patient
-- family/tuteur).
-- ==============================================================================

-- Direct participants (nurse or patient) can mark messages read in their files
drop policy if exists "Users mark messages read in their files" on public.messages;
create policy "Users mark messages read in their files" on public.messages
  for update using (
    patient_file_id in (
      select id from public.patient_files
      where nurse_id = auth.uid() or patient_id = auth.uid()
    )
  )
  with check (
    patient_file_id in (
      select id from public.patient_files
      where nurse_id = auth.uid() or patient_id = auth.uid()
    )
  );

-- Family members linked via family_links can mark messages read
drop policy if exists "Family marks linked messages read" on public.messages;
create policy "Family marks linked messages read" on public.messages
  for update using (
    patient_file_id in (
      select patient_file_id from public.family_links
      where family_user_id = auth.uid()
    )
  )
  with check (
    patient_file_id in (
      select patient_file_id from public.family_links
      where family_user_id = auth.uid()
    )
  );

-- Family members managing a patient (tuteur) can mark messages read
drop policy if exists "Family marks managed messages read" on public.messages;
create policy "Family marks managed messages read" on public.messages
  for update using (
    patient_file_id in (
      select pf.id from public.patient_files pf
      inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
      where pp.managed_by = auth.uid()
    )
  )
  with check (
    patient_file_id in (
      select pf.id from public.patient_files pf
      inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
      where pp.managed_by = auth.uid()
    )
  );
