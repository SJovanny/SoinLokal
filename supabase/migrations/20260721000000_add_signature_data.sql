-- Add signature_data column to appointments table
-- Stores the nurse's SVG signature for each completed care appointment

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS signature_data text;
