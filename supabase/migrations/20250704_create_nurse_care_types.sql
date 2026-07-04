create table nurse_care_types (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(nurse_id, name)
);

alter table nurse_care_types enable row level security;

create policy "Nurses can view their own care types"
  on nurse_care_types for select
  using (auth.uid() = nurse_id);

create policy "Nurses can insert their own care types"
  on nurse_care_types for insert
  with check (auth.uid() = nurse_id);

create policy "Nurses can delete their own care types"
  on nurse_care_types for delete
  using (auth.uid() = nurse_id);
