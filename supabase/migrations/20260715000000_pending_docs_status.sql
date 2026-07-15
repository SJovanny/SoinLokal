-- Add pending_docs and pending_review statuses, plus document tracking columns.
-- Supports the new flow where nurses must upload identity/profession documents
-- after RPPS API verification, before admin review.

-- ---------------------------------------------------------------------------
-- 1. Add new verification statuses to the CHECK constraint
-- ---------------------------------------------------------------------------

ALTER TABLE public.nurse_profiles
  DROP CONSTRAINT IF EXISTS nurse_profiles_verification_status_check;

ALTER TABLE public.nurse_profiles
  ADD CONSTRAINT nurse_profiles_verification_status_check
    CHECK (verification_status IN ('pending_docs', 'pending_review', 'verified', 'manual_review', 'rejected'));

-- Default to 'pending_docs' for new registrations (RPPS verified by API, awaiting documents)
ALTER TABLE public.nurse_profiles
  ALTER COLUMN verification_status SET DEFAULT 'pending_docs';

-- ---------------------------------------------------------------------------
-- 2. Add document path columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.nurse_profiles
  ADD COLUMN IF NOT EXISTS cni_path text,
  ADD COLUMN IF NOT EXISTS justificatif_domicile_path text,
  ADD COLUMN IF NOT EXISTS carte_pro_path text;
