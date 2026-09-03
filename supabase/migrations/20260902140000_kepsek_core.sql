-- Core tables for Bantu Beres – Asisten AI Kepala Sekolah.
-- Names are prefixed so this application can safely share a Supabase project.

create extension if not exists pgcrypto;
create schema if not exists kepsek_private;
revoke all on schema kepsek_private from public, anon, authenticated;

create table if not exists public.kepsek_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  principal_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kepsek_schools (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete restrict,
  npsn text not null unique check (npsn ~ '^[0-9]{8}$'),
  name text not null check (char_length(name) between 3 and 180),
  level text not null check (level in ('TK','PAUD','SD','SMP','SMA','SMK','SLB','Kesetaraan')),
  status text not null check (status in ('Negeri','Swasta')),
  school_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function kepsek_private.core_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kepsek_profiles_updated_at on public.kepsek_profiles;
create trigger kepsek_profiles_updated_at before update on public.kepsek_profiles
for each row execute function kepsek_private.core_set_updated_at();

drop trigger if exists kepsek_schools_updated_at on public.kepsek_schools;
create trigger kepsek_schools_updated_at before update on public.kepsek_schools
for each row execute function kepsek_private.core_set_updated_at();

create or replace function kepsek_private.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.kepsek_profiles(user_id, principal_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists kepsek_profile_on_auth_user_created on auth.users;
create trigger kepsek_profile_on_auth_user_created
after insert on auth.users
for each row execute function kepsek_private.create_user_profile();

alter table public.kepsek_profiles enable row level security;
alter table public.kepsek_schools enable row level security;

revoke all on public.kepsek_profiles, public.kepsek_schools from public, anon;
grant select, insert, update on public.kepsek_profiles to authenticated;
grant select, insert, update on public.kepsek_schools to authenticated;

drop policy if exists kepsek_profiles_select_self on public.kepsek_profiles;
drop policy if exists kepsek_profiles_insert_self on public.kepsek_profiles;
drop policy if exists kepsek_profiles_update_self on public.kepsek_profiles;
create policy kepsek_profiles_select_self on public.kepsek_profiles for select to authenticated
using (user_id = (select auth.uid()));
create policy kepsek_profiles_insert_self on public.kepsek_profiles for insert to authenticated
with check (user_id = (select auth.uid()));
create policy kepsek_profiles_update_self on public.kepsek_profiles for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists kepsek_schools_select_own on public.kepsek_schools;
drop policy if exists kepsek_schools_insert_own on public.kepsek_schools;
drop policy if exists kepsek_schools_update_own on public.kepsek_schools;
create policy kepsek_schools_select_own on public.kepsek_schools for select to authenticated
using (owner_user_id = (select auth.uid()));
create policy kepsek_schools_insert_own on public.kepsek_schools for insert to authenticated
with check (owner_user_id = (select auth.uid()));
create policy kepsek_schools_update_own on public.kepsek_schools for update to authenticated
using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

revoke execute on function kepsek_private.core_set_updated_at() from public, anon, authenticated;
revoke execute on function kepsek_private.create_user_profile() from public, anon, authenticated;
