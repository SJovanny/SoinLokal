-- ==============================================================================
-- Migration: Ajout des champs de notes de soin et visibilité patient
-- A exécuter dans l'éditeur SQL de Supabase
-- ==============================================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS care_performed text,
  ADD COLUMN IF NOT EXISTS observations text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS visible_to_patient boolean DEFAULT false;
