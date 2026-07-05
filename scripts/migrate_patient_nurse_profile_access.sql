-- Permet aux patients de voir les profils des infirmières liées via patient_files
-- Sans cette politique, les join Supabase (nurse:profiles!nurse_id) retournent null
-- car RLS bloque l'accès aux lignes de profiles pour les infirmières.

drop policy if exists "Patients can view linked nurse profiles" on public.profiles;
create policy "Patients can view linked nurse profiles" on public.profiles
  for select using (
    user_type = 'nurse'
    and exists (
      select 1 from public.patient_files
      where nurse_id = profiles.id
      and patient_id = auth.uid()
    )
  );
