-- Fix remaining infinite recursion: Admin policies on profiles self-reference is_admin.
-- Use SECURITY DEFINER helper function to break the cycle.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$;

DROP POLICY IF EXISTS "Admin views all profiles" ON public.profiles;
CREATE POLICY "Admin views all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin updates all profiles" ON public.profiles;
CREATE POLICY "Admin updates all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());