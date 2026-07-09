-- ==============================================================================
-- Migration: Family (managing a patient via managed_by) can view nurse_profiles
-- The existing "Family views linked nurse profiles" policy on nurse_profiles
-- only covers family_links, not managed patients (managed_by). This mirrors
-- the equivalent policy already present on public.profiles
-- ("Family views linked nurse base profiles").
-- ==============================================================================

drop policy if exists "Family views managed nurse profiles" on public.nurse_profiles;
create policy "Family views managed nurse profiles" on public.nurse_profiles
  for select using (
    profile_id in (
      select pf.nurse_id from public.patient_files pf
      inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
      where pp.managed_by = auth.uid()
    )
  );
