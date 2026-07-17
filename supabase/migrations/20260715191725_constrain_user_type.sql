-- Constrain user_type column in profiles table to allowed values.
-- Adds a CHECK constraint to ensure only valid user types are stored.
-- 'admin' is included for future use; existing 'is_admin' boolean flag is preserved.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
    CHECK (user_type IN ('admin', 'nurse', 'patient', 'family'));