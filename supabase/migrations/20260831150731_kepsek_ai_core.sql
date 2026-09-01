create table public.kepsek_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  principal_name text not null check (char_length(principal_name) between 1 and 180),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kepsek_schools (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  npsn text,
  level text not null check (level in ('TK', 'SD', 'SMP', 'SMA', 'SMK')),
  status text not null check (status in ('Negeri', 'Swasta')),
  academic_year text not null default '2026/2027',
  school_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kepsek_generation_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid not null references public.kepsek_schools (id) on delete cascade,
  document_type text not null check (char_length(document_type) between 1 and 50),
  additional_instruction text not null default '' check (char_length(additional_instruction) <= 3000),
  settings jsonb not null default '{}'::jsonb,
  prompt_hash text,
  created_at timestamptz not null default now()
);

create table public.kepsek_generations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.kepsek_generation_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid not null references public.kepsek_schools (id) on delete cascade,
  variant_number integer not null check (variant_number > 0),
  model text,
  key_slot smallint check (key_slot between 1 and 3),
  status text not null default 'pending' check (status in ('pending', 'completed', 'error')),
  content jsonb,
  error_code text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (group_id, variant_number)
);

create or replace function public.kepsek_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger kepsek_profiles_set_updated_at
before update on public.kepsek_profiles
for each row execute function public.kepsek_set_updated_at();

create trigger kepsek_schools_set_updated_at
before update on public.kepsek_schools
for each row execute function public.kepsek_set_updated_at();

alter table public.kepsek_profiles enable row level security;
alter table public.kepsek_schools enable row level security;
alter table public.kepsek_generation_groups enable row level security;
alter table public.kepsek_generations enable row level security;

create policy kepsek_profiles_select_own on public.kepsek_profiles
for select to authenticated
using ((select auth.uid()) = user_id);

create policy kepsek_profiles_insert_own on public.kepsek_profiles
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy kepsek_profiles_update_own on public.kepsek_profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy kepsek_schools_select_own on public.kepsek_schools
for select to authenticated
using ((select auth.uid()) = owner_user_id);

create policy kepsek_schools_insert_own on public.kepsek_schools
for insert to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy kepsek_schools_update_own on public.kepsek_schools
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy kepsek_groups_select_own on public.kepsek_generation_groups
for select to authenticated
using ((select auth.uid()) = user_id);

create policy kepsek_groups_insert_own on public.kepsek_generation_groups
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.kepsek_schools as school
    where school.id = school_id
      and school.owner_user_id = (select auth.uid())
  )
);

create policy kepsek_groups_update_own on public.kepsek_generation_groups
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy kepsek_generations_select_own on public.kepsek_generations
for select to authenticated
using ((select auth.uid()) = user_id);

create policy kepsek_generations_insert_own on public.kepsek_generations
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.kepsek_generation_groups as generation_group
    where generation_group.id = group_id
      and generation_group.user_id = (select auth.uid())
  )
);

create policy kepsek_generations_update_own on public.kepsek_generations
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant all on table public.kepsek_profiles to anon, authenticated, service_role;
grant all on table public.kepsek_schools to anon, authenticated, service_role;
grant all on table public.kepsek_generation_groups to anon, authenticated, service_role;
grant all on table public.kepsek_generations to anon, authenticated, service_role;
