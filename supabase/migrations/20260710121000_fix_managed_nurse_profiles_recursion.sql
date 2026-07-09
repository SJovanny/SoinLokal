-- ==============================================================================
-- Fix: infinite recursion in "Family views managed nurse profiles" policy
-- The policy on nurse_profiles queried patient_profiles, whose own RLS policy
-- ("Nurses can view patient details") queries nurse_profiles back, causing
-- Postgres to detect infinite recursion (42P17). Use a SECURITY DEFINER
-- helper function (bypasses RLS) to break the cycle, same pattern already
-- used for get_managed_patient_ids() in 20260706140500_family_rls.sql.
-- ==============================================================================

create or replace function public.get_managed_nurse_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select distinct pf.nurse_id
  from public.patient_files pf
  inner join public.patient_profiles pp on pp.profile_id = pf.patient_id
  where pp.managed_by = auth.uid();
$$;

drop policy if exists "Family views managed nurse profiles" on public.nurse_profiles;
create policy "Family views managed nurse profiles" on public.nurse_profiles
  for select using (
    profile_id in (select public.get_managed_nurse_ids())
  );
