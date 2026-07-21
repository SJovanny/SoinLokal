-- Fix regression: restore "nurses see other nurses' patient_files for shared
-- patients" (with the owning nurse's name visible via the nurse:profiles join)
-- WITHOUT the self-referencing RLS policy that caused infinite recursion
-- (42P17 "infinite recursion detected in policy for relation patient_files").
--
-- Root cause history:
--   20260721020000 introduced a SELECT policy on patient_files whose USING
--   clause contained a subquery on patient_files itself -> Postgres re-evaluates
--   RLS on patient_files while evaluating RLS on patient_files -> infinite loop.
--   20260721040000 worked around it by opening SELECT to ALL nurses on ALL
--   patient_files, which is broader than intended and drops the "same patient"
--   scoping.
--
-- This migration restores the "shared patient" scoping using a SECURITY
-- DEFINER function, which bypasses RLS internally and therefore cannot recurse.

-- 1. SECURITY DEFINER helper: does the current nurse have access to this patient
--    (i.e. do they have an active patient_files row for this patient_id)?
create or replace function public.nurse_has_patient_access(p_patient_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_files pf
    where pf.patient_id = p_patient_id
      and pf.nurse_id = auth.uid()
      and pf.is_active = true
  );
$$;

grant execute on function public.nurse_has_patient_access(uuid) to authenticated;

-- 2. Replace the "open to all nurses" policy with a scoped one:
--    a nurse sees their own patient_files rows, PLUS any patient_files row
--    for a patient they are also actively following themselves.
drop policy if exists "Nurse views all patient files" on public.patient_files;
drop policy if exists "Nurse views own patient files" on public.patient_files;
drop policy if exists "Nurse views shared patient files" on public.patient_files;

create policy "Nurse views own or shared patient files" on public.patient_files
  for select using (
    nurse_id = auth.uid()
    or public.nurse_has_patient_access(patient_id)
  );
