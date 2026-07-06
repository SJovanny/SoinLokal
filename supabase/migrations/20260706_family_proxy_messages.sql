-- ==============================================================================
-- Migration: Family proxy messaging for managed patients
-- Allows a family member (tuteur) to send messages as the managed patient
-- so that messages appear from the patient, not from the proche.
-- ==============================================================================

-- Replace "Family sends managed messages" to allow proxy author_id
drop policy if exists "Family sends managed messages" on public.messages;
create policy "Family sends managed messages" on public.messages
  for insert with check (
    patient_file_id in (
      select pf.id from public.patient_files pf
      inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
      where pp.managed_by = auth.uid()
    )
    and (
      author_id = auth.uid()
      or author_id in (
        select pp.profile_id from public.patient_profiles pp
        inner join public.patient_files pf on pf.patient_id = pp.profile_id
        where pp.managed_by = auth.uid() and pf.id = patient_file_id
      )
    )
  );
