ALTER TABLE public.nurse_profiles
ADD COLUMN IF NOT EXISTS rejection_note text;
