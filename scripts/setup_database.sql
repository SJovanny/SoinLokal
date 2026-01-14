-- ==============================================================================
-- Script de Configuration de la Base de Données SoinLokal (CORRIGÉ & COMPLET)
-- A exécuter dans l'éditeur SQL de Supabase pour corriger les erreurs RLS
-- ==============================================================================

-- 1. Nettoyage (si nécessaire, pour repartir de zéro, décommentez les lignes suivantes)
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop table if exists public.profiles;

-- 2. Création de la table 'profiles'
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  user_type text check (user_type in ('patient', 'family', 'nurse')),
  phone text,
  
  -- Champs spécifiques aux infirmières
  adeli text,
  -- Note: specialties est défini comme text[] (tableau de texte) pour gérer plusieurs spécialités
  specialties text[], 
  zone text,
  
  -- Champs spécifiques aux patients
  address text,
  emergency_contact text,
  
  verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  primary key (id)
);

-- 3. Sécurité (RLS)
alter table public.profiles enable row level security;

-- Politiques mises à jour
create policy "View own profile" on public.profiles for select using ( auth.uid() = id );
create policy "Update own profile" on public.profiles for update using ( auth.uid() = id );
-- La politique INSERT n'est plus nécessaire car le Trigger s'en charge avec les droits admin
-- Mais on peut la garder pour d'autres cas si besoin (facultatif)
-- create policy "Create own profile" on public.profiles for insert with check ( auth.uid() = id );

-- 4. FONCTION & TRIGGER pour la création automatique du profil
-- C'est LA solution pour éviter l'erreur "row-level security policy violation" lors de l'inscription.
-- Le trigger s'exécute côté serveur avec les privilèges nécessaires.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    user_type,
    phone,
    adeli,
    specialties,
    zone,
    address,
    emergency_contact,
    verified
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'user_type',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'adeli',
    -- Gestion sécurisée des tableaux: vérifie que c'est bien un array avant de parser
    case 
      when jsonb_typeof(new.raw_user_meta_data->'specialties') = 'array' 
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'specialties'))
      else null 
    end,
    new.raw_user_meta_data->>'zone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'emergency_contact',
    coalesce((new.raw_user_meta_data->>'verified')::boolean, false)
  );
  return new;
end;
$$;

-- Création du déclencheur (trigger)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Trigger pour updated_at
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on public.profiles
  for each row execute procedure moddatetime (updated_at);
