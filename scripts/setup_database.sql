-- ==============================================================================
-- Script de Configuration de la Base de Données SoinLokal (v2)
-- A exécuter dans l'éditeur SQL de Supabase
-- ==============================================================================

-- 1. Nettoyage (décommentez pour repartir de zéro)
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop table if exists public.messages;
-- drop table if exists public.family_links;
-- drop table if exists public.appointments;
-- drop table if exists public.patient_files;
-- drop table if exists public.nurse_profiles;
-- drop table if exists public.patient_profiles;
-- drop table if exists public.profiles;

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- Base identity table (shared by all roles)
create table if not exists public.profiles (
  id          uuid not null references auth.users(id) on delete cascade,
  email       text,
  first_name  text,
  last_name   text,
  user_type   text check (user_type in ('patient', 'family', 'nurse')),
  phone       text,
  verified    boolean default false,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at  timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Nurse-specific data (1:1 with profiles where user_type = 'nurse')
create table if not exists public.nurse_profiles (
  id            uuid default gen_random_uuid() primary key,
  profile_id    uuid not null unique references public.profiles(id) on delete cascade,
  adeli         text,
  rpps_number   text,
  specialties   text[],
  zone          text,
  bio           text,
  rating        numeric(3,2) default 0,
  total_patients integer default 0,
  total_visits  integer default 0,
  created_at    timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at    timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Patient-specific data (1:1 with profiles where user_type = 'patient')
create table if not exists public.patient_profiles (
  id                uuid default gen_random_uuid() primary key,
  profile_id        uuid not null unique references public.profiles(id) on delete cascade,
  dob               date,
  address           text,
  address_label     text,
  gps_lat           double precision,
  gps_lng           double precision,
  access_code       text,
  emergency_contact text,
  medical_notes     text,
  allergies         text[],
  created_at        timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at        timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Patient files (medical record — owned by a nurse, references a patient)
create table if not exists public.patient_files (
  id              uuid default gen_random_uuid() primary key,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  nurse_id        uuid not null references public.profiles(id) on delete cascade,
  prescription    text,
  care_plan       text,
  is_active       boolean default true,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(patient_id, nurse_id)
);

-- Appointments
create table if not exists public.appointments (
  id              uuid default gen_random_uuid() primary key,
  patient_file_id uuid not null references public.patient_files(id) on delete cascade,
  nurse_id        uuid not null references public.profiles(id) on delete cascade,
  date            date not null,
  time            time not null,
  care_type       text not null,
  status          text check (status in ('pending', 'confirmed', 'completed', 'cancelled')) default 'pending',
  address         text,
  notes           text,
  completion_note text,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Family links (connecting family members to patient files)
create table if not exists public.family_links (
  id                uuid default gen_random_uuid() primary key,
  family_user_id    uuid not null references public.profiles(id) on delete cascade,
  patient_file_id   uuid not null references public.patient_files(id) on delete cascade,
  permissions       text check (permissions in ('read_only', 'can_message')) default 'read_only',
  created_at        timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(family_user_id, patient_file_id)
);

-- Messages
create table if not exists public.messages (
  id              uuid default gen_random_uuid() primary key,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  patient_file_id uuid not null references public.patient_files(id) on delete cascade,
  content         text not null,
  is_read         boolean default false,
  created_at      timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.nurse_profiles enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.patient_files enable row level security;
alter table public.appointments enable row level security;
alter table public.family_links enable row level security;
alter table public.messages enable row level security;

-- Profiles: users can view and update their own profile
drop policy if exists "View own profile" on public.profiles;
create policy "View own profile" on public.profiles
  for select using ( auth.uid() = id );
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update using ( auth.uid() = id );

-- Nurse profiles: nurse can view/update their own; patients/family can view the nurse linked to their file
drop policy if exists "Nurse views own nurse profile" on public.nurse_profiles;
create policy "Nurse views own nurse profile" on public.nurse_profiles
  for select using ( profile_id = auth.uid() );
drop policy if exists "Nurse updates own nurse profile" on public.nurse_profiles;
create policy "Nurse updates own nurse profile" on public.nurse_profiles
  for update using ( profile_id = auth.uid() );

-- Patient profiles: patient can view/update their own
drop policy if exists "Patient views own patient profile" on public.patient_profiles;
create policy "Patient views own patient profile" on public.patient_profiles
  for select using ( profile_id = auth.uid() );
drop policy if exists "Patient updates own patient profile" on public.patient_profiles;
create policy "Patient updates own patient profile" on public.patient_profiles
  for update using ( profile_id = auth.uid() );

-- Nurses can view patient profiles (for patient discovery / search)
-- Uses nurse_profiles to avoid infinite recursion on profiles table
drop policy if exists "Nurses can view patient profiles" on public.profiles;
create policy "Nurses can view patient profiles" on public.profiles
  for select using (
    user_type = 'patient'
    and exists (select 1 from public.nurse_profiles where profile_id = auth.uid())
  );

-- Nurses can view patient_profiles details (for patient discovery / search)
drop policy if exists "Nurses can view patient details" on public.patient_profiles;
create policy "Nurses can view patient details" on public.patient_profiles
  for select using (
    exists (select 1 from public.nurse_profiles where profile_id = auth.uid())
  );

-- Patient files: nurse can view/update their own files; patient can view files they're in
drop policy if exists "Nurse views own patient files" on public.patient_files;
create policy "Nurse views own patient files" on public.patient_files
  for select using ( nurse_id = auth.uid() );
drop policy if exists "Patient views own patient files" on public.patient_files;
create policy "Patient views own patient files" on public.patient_files
  for select using ( patient_id = auth.uid() );
drop policy if exists "Nurse creates patient files" on public.patient_files;
create policy "Nurse creates patient files" on public.patient_files
  for insert with check ( nurse_id = auth.uid() );
drop policy if exists "Nurse updates own patient files" on public.patient_files;
create policy "Nurse updates own patient files" on public.patient_files
  for update using ( nurse_id = auth.uid() );

-- Appointments: nurse can CRUD their appointments; patient can view theirs
drop policy if exists "Nurse manages appointments" on public.appointments;
create policy "Nurse manages appointments" on public.appointments
  for all using ( nurse_id = auth.uid() )
  with check (
    nurse_id = auth.uid()
    and exists (
      select 1 from public.patient_files
      where id = patient_file_id and nurse_id = auth.uid()
    )
  );
drop policy if exists "Patient views appointments" on public.appointments;
create policy "Patient views appointments" on public.appointments
  for select using (
    patient_file_id in (
      select id from public.patient_files where patient_id = auth.uid()
    )
  );

-- Family links: family member can view their own links
drop policy if exists "Family views own links" on public.family_links;
create policy "Family views own links" on public.family_links
  for select using ( family_user_id = auth.uid() );

-- Messages: author can view/create; participants of the patient file can view
drop policy if exists "Users view messages in their files" on public.messages;
create policy "Users view messages in their files" on public.messages
  for select using (
    patient_file_id in (
      select id from public.patient_files
      where nurse_id = auth.uid() or patient_id = auth.uid()
    )
  );
drop policy if exists "Users send messages in their files" on public.messages;
create policy "Users send messages in their files" on public.messages
  for insert with check (
    author_id = auth.uid() and
    patient_file_id in (
      select id from public.patient_files
      where nurse_id = auth.uid() or patient_id = auth.uid()
    )
  );

-- ==============================================================================
-- 4. TRIGGER: auto-create profile on auth user creation
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_type text;
begin
  v_user_type := new.raw_user_meta_data->>'user_type';

  -- Insert base profile
  insert into public.profiles (
    id, email, first_name, last_name, user_type, phone, verified
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    v_user_type,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'verified')::boolean, false)
  );

  -- Insert role-specific profile
  if v_user_type = 'nurse' then
    insert into public.nurse_profiles (
      profile_id, adeli, specialties, zone
    ) values (
      new.id,
      new.raw_user_meta_data->>'adeli',
      case
        when jsonb_typeof(new.raw_user_meta_data->'specialties') = 'array'
        then array(select jsonb_array_elements_text(new.raw_user_meta_data->'specialties'))
        else null
      end,
      new.raw_user_meta_data->>'zone'
    );
  elsif v_user_type = 'patient' then
    insert into public.patient_profiles (
      profile_id, address, emergency_contact
    ) values (
      new.id,
      new.raw_user_meta_data->>'address',
      new.raw_user_meta_data->>'emergency_contact'
    );
  end if;

  return new;
end;
$$;

-- Create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 5. TRIGGER: auto-update updated_at
-- ==============================================================================

create extension if not exists moddatetime schema extensions;

drop trigger if exists handle_updated_at on public.profiles;
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure moddatetime (updated_at);
drop trigger if exists handle_updated_at on public.nurse_profiles;
create trigger handle_updated_at before update on public.nurse_profiles
  for each row execute procedure moddatetime (updated_at);
drop trigger if exists handle_updated_at on public.patient_profiles;
create trigger handle_updated_at before update on public.patient_profiles
  for each row execute procedure moddatetime (updated_at);
drop trigger if exists handle_updated_at on public.patient_files;
create trigger handle_updated_at before update on public.patient_files
  for each row execute procedure moddatetime (updated_at);
drop trigger if exists handle_updated_at on public.appointments;
create trigger handle_updated_at before update on public.appointments
  for each row execute procedure moddatetime (updated_at);
