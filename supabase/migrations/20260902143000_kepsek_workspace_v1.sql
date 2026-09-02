-- Bantu Beres KEPSEK AI — isolated workspace schema.
-- All objects use the kepsek_ prefix so this migration can coexist safely
-- with other applications in the same Supabase project.

create extension if not exists pgcrypto;
create schema if not exists kepsek_private;
revoke all on schema kepsek_private from public, anon, authenticated;

create table if not exists public.kepsek_projects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  type text not null,
  title text not null check (char_length(title) between 3 and 240),
  description text,
  status text not null default 'draft' check (status in ('draft','active','review','completed','archived')),
  progress smallint not null default 0 check (progress between 0 and 100),
  due_date date,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kepsek_sources (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 255),
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status text not null default 'stored' check (status in ('stored','processing','ready','failed')),
  extracted_text text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kepsek_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  project_id uuid references public.kepsek_projects(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  type text not null,
  title text not null check (char_length(title) between 3 and 240),
  status text not null default 'draft' check (status in ('draft','review','approved','archived')),
  content jsonb not null default '{}'::jsonb,
  source_ids uuid[] not null default '{}'::uuid[],
  version integer not null default 1 check (version > 0),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kepsek_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kepsek_documents(id) on delete cascade,
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  version integer not null check (version > 0),
  content jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table if not exists public.kepsek_agendas (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 240),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.kepsek_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.kepsek_schools(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial','kepsek_pro','multi_school','institution')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','cancelled','expired')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kepsek_projects_school_idx on public.kepsek_projects(school_id, updated_at desc);
create index if not exists kepsek_projects_created_by_idx on public.kepsek_projects(created_by);
create index if not exists kepsek_sources_school_idx on public.kepsek_sources(school_id, created_at desc);
create index if not exists kepsek_sources_uploaded_by_idx on public.kepsek_sources(uploaded_by);
create index if not exists kepsek_documents_school_idx on public.kepsek_documents(school_id, updated_at desc);
create index if not exists kepsek_documents_project_idx on public.kepsek_documents(project_id);
create index if not exists kepsek_documents_created_by_idx on public.kepsek_documents(created_by);
create index if not exists kepsek_documents_approved_by_idx on public.kepsek_documents(approved_by);
create index if not exists kepsek_versions_document_idx on public.kepsek_document_versions(document_id);
create index if not exists kepsek_versions_school_idx on public.kepsek_document_versions(school_id);
create index if not exists kepsek_versions_changed_by_idx on public.kepsek_document_versions(changed_by);
create index if not exists kepsek_agendas_school_starts_idx on public.kepsek_agendas(school_id, starts_at);
create index if not exists kepsek_agendas_created_by_idx on public.kepsek_agendas(created_by);

create or replace function kepsek_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare target_table text;
begin
  foreach target_table in array array['kepsek_projects','kepsek_sources','kepsek_documents','kepsek_agendas','kepsek_subscriptions'] loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_updated_at', target_table);
    execute format('create trigger %I before update on public.%I for each row execute function kepsek_private.set_updated_at()', target_table || '_updated_at', target_table);
  end loop;
end $$;

create or replace function kepsek_private.create_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.kepsek_subscriptions(school_id) values (new.id)
  on conflict (school_id) do nothing;
  return new;
end;
$$;

drop trigger if exists kepsek_workspace_subscription_on_school on public.kepsek_schools;
create trigger kepsek_workspace_subscription_on_school
after insert on public.kepsek_schools
for each row execute function kepsek_private.create_subscription();

insert into public.kepsek_subscriptions(school_id)
select id from public.kepsek_schools
on conflict (school_id) do nothing;

alter table public.kepsek_projects enable row level security;
alter table public.kepsek_sources enable row level security;
alter table public.kepsek_documents enable row level security;
alter table public.kepsek_document_versions enable row level security;
alter table public.kepsek_agendas enable row level security;
alter table public.kepsek_subscriptions enable row level security;

revoke all on public.kepsek_projects, public.kepsek_sources, public.kepsek_documents,
  public.kepsek_document_versions, public.kepsek_agendas, public.kepsek_subscriptions from anon;
grant select, insert, update, delete on public.kepsek_projects to authenticated;
grant select, insert, update, delete on public.kepsek_sources to authenticated;
grant select, insert, update, delete on public.kepsek_documents to authenticated;
grant select on public.kepsek_document_versions to authenticated;
grant select, insert, update, delete on public.kepsek_agendas to authenticated;
grant select on public.kepsek_subscriptions to authenticated;
grant select, insert, update on public.kepsek_profiles, public.kepsek_schools to authenticated;

drop policy if exists kepsek_projects_select_own on public.kepsek_projects;
drop policy if exists kepsek_projects_insert_own on public.kepsek_projects;
drop policy if exists kepsek_projects_update_own on public.kepsek_projects;
drop policy if exists kepsek_projects_delete_own on public.kepsek_projects;
create policy kepsek_projects_select_own on public.kepsek_projects for select to authenticated using (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_projects_insert_own on public.kepsek_projects for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_projects_update_own on public.kepsek_projects for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_projects_delete_own on public.kepsek_projects for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists kepsek_sources_select_own on public.kepsek_sources;
drop policy if exists kepsek_sources_insert_own on public.kepsek_sources;
drop policy if exists kepsek_sources_update_own on public.kepsek_sources;
drop policy if exists kepsek_sources_delete_own on public.kepsek_sources;
create policy kepsek_sources_select_own on public.kepsek_sources for select to authenticated using (uploaded_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_sources_insert_own on public.kepsek_sources for insert to authenticated with check (uploaded_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_sources_update_own on public.kepsek_sources for update to authenticated using (uploaded_by = (select auth.uid())) with check (uploaded_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_sources_delete_own on public.kepsek_sources for delete to authenticated using (uploaded_by = (select auth.uid()));

drop policy if exists kepsek_documents_select_own on public.kepsek_documents;
drop policy if exists kepsek_documents_insert_own on public.kepsek_documents;
drop policy if exists kepsek_documents_update_own on public.kepsek_documents;
drop policy if exists kepsek_documents_delete_own on public.kepsek_documents;
create policy kepsek_documents_select_own on public.kepsek_documents for select to authenticated using (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_documents_insert_own on public.kepsek_documents for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_documents_update_own on public.kepsek_documents for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_documents_delete_own on public.kepsek_documents for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists kepsek_versions_select_own on public.kepsek_document_versions;
create policy kepsek_versions_select_own on public.kepsek_document_versions for select to authenticated using (exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));

drop policy if exists kepsek_agendas_select_own on public.kepsek_agendas;
drop policy if exists kepsek_agendas_insert_own on public.kepsek_agendas;
drop policy if exists kepsek_agendas_update_own on public.kepsek_agendas;
drop policy if exists kepsek_agendas_delete_own on public.kepsek_agendas;
create policy kepsek_agendas_select_own on public.kepsek_agendas for select to authenticated using (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_agendas_insert_own on public.kepsek_agendas for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_agendas_update_own on public.kepsek_agendas for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()) and exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));
create policy kepsek_agendas_delete_own on public.kepsek_agendas for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists kepsek_subscriptions_select_own on public.kepsek_subscriptions;
create policy kepsek_subscriptions_select_own on public.kepsek_subscriptions for select to authenticated using (exists (select 1 from public.kepsek_schools s where s.id = school_id and s.owner_user_id = (select auth.uid())));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('kepsek-school-files','kepsek-school-files',false,15728640,array['application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists kepsek_storage_select_own on storage.objects;
drop policy if exists kepsek_storage_insert_own on storage.objects;
drop policy if exists kepsek_storage_update_own on storage.objects;
drop policy if exists kepsek_storage_delete_own on storage.objects;
create policy kepsek_storage_select_own on storage.objects for select to authenticated using (bucket_id = 'kepsek-school-files' and exists (select 1 from public.kepsek_schools s where s.id = ((storage.foldername(name))[1])::uuid and s.owner_user_id = (select auth.uid())));
create policy kepsek_storage_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'kepsek-school-files' and exists (select 1 from public.kepsek_schools s where s.id = ((storage.foldername(name))[1])::uuid and s.owner_user_id = (select auth.uid())));
create policy kepsek_storage_update_own on storage.objects for update to authenticated using (bucket_id = 'kepsek-school-files' and exists (select 1 from public.kepsek_schools s where s.id = ((storage.foldername(name))[1])::uuid and s.owner_user_id = (select auth.uid()))) with check (bucket_id = 'kepsek-school-files' and exists (select 1 from public.kepsek_schools s where s.id = ((storage.foldername(name))[1])::uuid and s.owner_user_id = (select auth.uid())));
create policy kepsek_storage_delete_own on storage.objects for delete to authenticated using (bucket_id = 'kepsek-school-files' and exists (select 1 from public.kepsek_schools s where s.id = ((storage.foldername(name))[1])::uuid and s.owner_user_id = (select auth.uid())));

revoke execute on function kepsek_private.set_updated_at() from public, anon, authenticated;
revoke execute on function kepsek_private.create_subscription() from public, anon, authenticated;
