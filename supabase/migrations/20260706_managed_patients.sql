-- ==============================================================================
-- Migration: Managed patients (shadow accounts for family members)
-- Allows family members to create patient profiles for non-tech-savvy patients
-- ==============================================================================

-- Add managed_by column to patient_profiles
alter table public.patient_profiles
  add column if not exists managed_by uuid references public.profiles(id) on delete set null;

-- Add is_managed flag
alter table public.patient_profiles
  add column if not exists is_managed boolean default false;

-- Index for querying managed patients by family member
create index if not exists idx_patient_profiles_managed_by
  on public.patient_profiles(managed_by) where managed_by is not null;
