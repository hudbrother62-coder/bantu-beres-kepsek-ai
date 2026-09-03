-- Full-access school team and Google Drive folder references.
-- Operational features have no role hierarchy: every accepted member can work
-- with the same school data. Only invitation/removal remains owner-managed.

create schema if not exists kepsek_private;

create table if not exists public.kepsek_workspace_members (
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  display_name text not null check (char_length(display_name) between 2 and 160),
  added_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz not null default now(),
  primary key (school_id, user_id)
);

create index if not exists kepsek_workspace_members_user_idx
  on public.kepsek_workspace_members(user_id, school_id);
create index if not exists kepsek_workspace_members_added_by_idx
  on public.kepsek_workspace_members(added_by);

create table if not exists public.kepsek_workspace_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  email text not null check (email = lower(email)),
  display_name text not null check (char_length(display_name) between 2 and 160),
  token_hash text not null unique check (char_length(token_hash) = 64),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists kepsek_workspace_invites_school_idx
  on public.kepsek_workspace_invites(school_id, created_at desc);
create index if not exists kepsek_workspace_invites_email_idx
  on public.kepsek_workspace_invites(lower(email));
create index if not exists kepsek_workspace_invites_invited_by_idx
  on public.kepsek_workspace_invites(invited_by);
create index if not exists kepsek_workspace_invites_accepted_by_idx
  on public.kepsek_workspace_invites(accepted_by)
  where accepted_by is not null;

create table if not exists public.kepsek_template_folders (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 180),
  category text not null default 'Folder sekolah' check (char_length(category) between 2 and 80),
  description text check (description is null or char_length(description) <= 600),
  drive_url text not null check (
    drive_url ~ '^https://(drive|docs)\.google\.com/'
    and char_length(drive_url) <= 1000
  ),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kepsek_template_folders_school_idx
  on public.kepsek_template_folders(school_id, updated_at desc);
create index if not exists kepsek_template_folders_created_by_idx
  on public.kepsek_template_folders(created_by);

create or replace function kepsek_private.is_school_owner(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.kepsek_schools school
    where school.id = target_school_id
      and school.owner_user_id = (select auth.uid())
  )
$$;

create or replace function kepsek_private.is_school_member(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select kepsek_private.is_school_owner(target_school_id)
  or exists (
    select 1 from public.kepsek_workspace_members member
    where member.school_id = target_school_id
      and member.user_id = (select auth.uid())
  )
$$;

create or replace function kepsek_private.preserve_school_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Workspace owner cannot be changed from the application';
  end if;
  return new;
end;
$$;

drop trigger if exists kepsek_schools_preserve_owner on public.kepsek_schools;
create trigger kepsek_schools_preserve_owner
before update on public.kepsek_schools
for each row execute function kepsek_private.preserve_school_owner();

drop trigger if exists kepsek_template_folders_updated_at on public.kepsek_template_folders;
create trigger kepsek_template_folders_updated_at
before update on public.kepsek_template_folders
for each row execute function kepsek_private.set_updated_at();

create or replace function public.kepsek_claim_workspace_invite(p_invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  wanted_hash text;
  selected_invite public.kepsek_workspace_invites%rowtype;
begin
  if caller_id is null then
    raise exception 'Anda harus masuk terlebih dahulu';
  end if;
  if p_invite_token is null or char_length(p_invite_token) < 32 then
    raise exception 'Tautan undangan tidak valid';
  end if;
  if caller_email = '' then
    raise exception 'Email akun tidak ditemukan';
  end if;

  wanted_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_invite_token,'UTF8')),'hex');

  select invite.* into selected_invite
  from public.kepsek_workspace_invites invite
  where invite.token_hash = wanted_hash
  for update;

  if not found then
    raise exception 'Undangan tidak ditemukan atau sudah diganti';
  end if;
  if selected_invite.expires_at <= now() then
    raise exception 'Undangan sudah kedaluwarsa';
  end if;
  if lower(selected_invite.email) <> caller_email then
    raise exception 'Masuklah menggunakan email yang menerima undangan';
  end if;
  -- One link can only be claimed once. This also prevents a removed member from
  -- regaining access by reopening an old link.
  if selected_invite.accepted_at is not null then
    raise exception 'Undangan sudah digunakan';
  end if;
  if exists (
    select 1 from public.kepsek_schools school
    where school.owner_user_id = caller_id and school.id <> selected_invite.school_id
  ) or exists (
    select 1 from public.kepsek_workspace_members member
    where member.user_id = caller_id and member.school_id <> selected_invite.school_id
  ) then
    raise exception 'Akun ini sudah terhubung ke workspace sekolah lain';
  end if;

  insert into public.kepsek_workspace_members(school_id,user_id,email,display_name,added_by)
  values (selected_invite.school_id,caller_id,caller_email,selected_invite.display_name,selected_invite.invited_by)
  on conflict (school_id,user_id) do update
    set email = excluded.email, display_name = excluded.display_name;

  update public.kepsek_workspace_invites
  set accepted_at = coalesce(accepted_at,now()), accepted_by = caller_id
  where id = selected_invite.id;

  return selected_invite.school_id;
end;
$$;

alter table public.kepsek_workspace_members enable row level security;
alter table public.kepsek_workspace_invites enable row level security;
alter table public.kepsek_template_folders enable row level security;

revoke all on public.kepsek_workspace_members, public.kepsek_workspace_invites,
  public.kepsek_template_folders from public, anon;
grant select, delete on public.kepsek_workspace_members to authenticated;
grant select, insert, delete on public.kepsek_workspace_invites to authenticated;
grant select, insert, update, delete on public.kepsek_template_folders to authenticated;

grant usage on schema kepsek_private to authenticated;
revoke all on function kepsek_private.is_school_owner(uuid) from public, anon;
revoke all on function kepsek_private.is_school_member(uuid) from public, anon;
grant execute on function kepsek_private.is_school_owner(uuid) to authenticated;
grant execute on function kepsek_private.is_school_member(uuid) to authenticated;
revoke all on function public.kepsek_claim_workspace_invite(text) from public, anon;
grant execute on function public.kepsek_claim_workspace_invite(text) to authenticated;
revoke execute on function kepsek_private.preserve_school_owner() from public, anon, authenticated;

drop policy if exists kepsek_workspace_members_select_school on public.kepsek_workspace_members;
drop policy if exists kepsek_workspace_members_delete_owner on public.kepsek_workspace_members;
create policy kepsek_workspace_members_select_school on public.kepsek_workspace_members
for select to authenticated using (kepsek_private.is_school_member(school_id));
create policy kepsek_workspace_members_delete_owner on public.kepsek_workspace_members
for delete to authenticated using (kepsek_private.is_school_owner(school_id));

drop policy if exists kepsek_workspace_invites_select_owner on public.kepsek_workspace_invites;
drop policy if exists kepsek_workspace_invites_insert_owner on public.kepsek_workspace_invites;
drop policy if exists kepsek_workspace_invites_delete_owner on public.kepsek_workspace_invites;
create policy kepsek_workspace_invites_select_owner on public.kepsek_workspace_invites
for select to authenticated using (kepsek_private.is_school_owner(school_id));
create policy kepsek_workspace_invites_insert_owner on public.kepsek_workspace_invites
for insert to authenticated with check (
  invited_by = (select auth.uid()) and kepsek_private.is_school_owner(school_id)
);
create policy kepsek_workspace_invites_delete_owner on public.kepsek_workspace_invites
for delete to authenticated using (kepsek_private.is_school_owner(school_id));

drop policy if exists kepsek_template_folders_select_workspace on public.kepsek_template_folders;
drop policy if exists kepsek_template_folders_insert_workspace on public.kepsek_template_folders;
drop policy if exists kepsek_template_folders_update_workspace on public.kepsek_template_folders;
drop policy if exists kepsek_template_folders_delete_workspace on public.kepsek_template_folders;
create policy kepsek_template_folders_select_workspace on public.kepsek_template_folders
for select to authenticated using (kepsek_private.is_school_member(school_id));
create policy kepsek_template_folders_insert_workspace on public.kepsek_template_folders
for insert to authenticated with check (
  created_by = (select auth.uid()) and kepsek_private.is_school_member(school_id)
);
create policy kepsek_template_folders_update_workspace on public.kepsek_template_folders
for update to authenticated using (kepsek_private.is_school_member(school_id))
with check (kepsek_private.is_school_member(school_id));
create policy kepsek_template_folders_delete_workspace on public.kepsek_template_folders
for delete to authenticated using (kepsek_private.is_school_member(school_id));

-- School rows become visible and editable to every accepted workspace member.
drop policy if exists kepsek_schools_select_own on public.kepsek_schools;
drop policy if exists kepsek_schools_insert_own on public.kepsek_schools;
drop policy if exists kepsek_schools_update_own on public.kepsek_schools;
drop policy if exists kepsek_schools_select_workspace on public.kepsek_schools;
drop policy if exists kepsek_schools_insert_owner on public.kepsek_schools;
drop policy if exists kepsek_schools_update_workspace on public.kepsek_schools;
create policy kepsek_schools_select_workspace on public.kepsek_schools
for select to authenticated using (kepsek_private.is_school_member(id));
create policy kepsek_schools_insert_owner on public.kepsek_schools
for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy kepsek_schools_update_workspace on public.kepsek_schools
for update to authenticated using (kepsek_private.is_school_member(id))
with check (kepsek_private.is_school_member(id));

-- Existing workspace tables use membership, not record creator, for access.
drop policy if exists kepsek_projects_select_own on public.kepsek_projects;
drop policy if exists kepsek_projects_insert_own on public.kepsek_projects;
drop policy if exists kepsek_projects_update_own on public.kepsek_projects;
drop policy if exists kepsek_projects_delete_own on public.kepsek_projects;
create policy kepsek_projects_select_workspace on public.kepsek_projects for select to authenticated using (kepsek_private.is_school_member(school_id));
create policy kepsek_projects_insert_workspace on public.kepsek_projects for insert to authenticated with check (created_by = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_projects_update_workspace on public.kepsek_projects for update to authenticated using (kepsek_private.is_school_member(school_id)) with check (kepsek_private.is_school_member(school_id));
create policy kepsek_projects_delete_workspace on public.kepsek_projects for delete to authenticated using (kepsek_private.is_school_member(school_id));

drop policy if exists kepsek_sources_select_own on public.kepsek_sources;
drop policy if exists kepsek_sources_insert_own on public.kepsek_sources;
drop policy if exists kepsek_sources_update_own on public.kepsek_sources;
drop policy if exists kepsek_sources_delete_own on public.kepsek_sources;
create policy kepsek_sources_select_workspace on public.kepsek_sources for select to authenticated using (kepsek_private.is_school_member(school_id));
create policy kepsek_sources_insert_workspace on public.kepsek_sources for insert to authenticated with check (uploaded_by = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_sources_update_workspace on public.kepsek_sources for update to authenticated using (kepsek_private.is_school_member(school_id)) with check (kepsek_private.is_school_member(school_id));
create policy kepsek_sources_delete_workspace on public.kepsek_sources for delete to authenticated using (kepsek_private.is_school_member(school_id));

drop policy if exists kepsek_documents_select_own on public.kepsek_documents;
drop policy if exists kepsek_documents_insert_own on public.kepsek_documents;
drop policy if exists kepsek_documents_update_own on public.kepsek_documents;
drop policy if exists kepsek_documents_delete_own on public.kepsek_documents;
create policy kepsek_documents_select_workspace on public.kepsek_documents for select to authenticated using (kepsek_private.is_school_member(school_id));
create policy kepsek_documents_insert_workspace on public.kepsek_documents for insert to authenticated with check (created_by = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_documents_update_workspace on public.kepsek_documents for update to authenticated using (kepsek_private.is_school_member(school_id)) with check (kepsek_private.is_school_member(school_id));
create policy kepsek_documents_delete_workspace on public.kepsek_documents for delete to authenticated using (kepsek_private.is_school_member(school_id));

drop policy if exists kepsek_versions_select_own on public.kepsek_document_versions;
create policy kepsek_versions_select_workspace on public.kepsek_document_versions for select to authenticated using (kepsek_private.is_school_member(school_id));

drop policy if exists kepsek_agendas_select_own on public.kepsek_agendas;
drop policy if exists kepsek_agendas_insert_own on public.kepsek_agendas;
drop policy if exists kepsek_agendas_update_own on public.kepsek_agendas;
drop policy if exists kepsek_agendas_delete_own on public.kepsek_agendas;
create policy kepsek_agendas_select_workspace on public.kepsek_agendas for select to authenticated using (kepsek_private.is_school_member(school_id));
create policy kepsek_agendas_insert_workspace on public.kepsek_agendas for insert to authenticated with check (created_by = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_agendas_update_workspace on public.kepsek_agendas for update to authenticated using (kepsek_private.is_school_member(school_id)) with check (kepsek_private.is_school_member(school_id));
create policy kepsek_agendas_delete_workspace on public.kepsek_agendas for delete to authenticated using (kepsek_private.is_school_member(school_id));

drop policy if exists kepsek_subscriptions_select_own on public.kepsek_subscriptions;
create policy kepsek_subscriptions_select_workspace on public.kepsek_subscriptions for select to authenticated using (kepsek_private.is_school_member(school_id));

-- Assistant conversations stay private per account, while using shared school memory.
drop policy if exists kepsek_assistant_messages_select_own on public.kepsek_assistant_messages;
drop policy if exists kepsek_assistant_messages_insert_own on public.kepsek_assistant_messages;
drop policy if exists kepsek_assistant_messages_delete_own on public.kepsek_assistant_messages;
create policy kepsek_assistant_messages_select_self on public.kepsek_assistant_messages for select to authenticated using (user_id = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_assistant_messages_insert_self on public.kepsek_assistant_messages for insert to authenticated with check (user_id = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_assistant_messages_delete_self on public.kepsek_assistant_messages for delete to authenticated using (user_id = (select auth.uid()) and kepsek_private.is_school_member(school_id));

drop policy if exists kepsek_storage_select_own on storage.objects;
drop policy if exists kepsek_storage_insert_own on storage.objects;
drop policy if exists kepsek_storage_update_own on storage.objects;
drop policy if exists kepsek_storage_delete_own on storage.objects;
create policy kepsek_storage_select_workspace on storage.objects for select to authenticated using (bucket_id = 'kepsek-school-files' and kepsek_private.is_school_member(((storage.foldername(name))[1])::uuid));
create policy kepsek_storage_insert_workspace on storage.objects for insert to authenticated with check (bucket_id = 'kepsek-school-files' and kepsek_private.is_school_member(((storage.foldername(name))[1])::uuid));
create policy kepsek_storage_update_workspace on storage.objects for update to authenticated using (bucket_id = 'kepsek-school-files' and kepsek_private.is_school_member(((storage.foldername(name))[1])::uuid)) with check (bucket_id = 'kepsek-school-files' and kepsek_private.is_school_member(((storage.foldername(name))[1])::uuid));
create policy kepsek_storage_delete_workspace on storage.objects for delete to authenticated using (bucket_id = 'kepsek-school-files' and kepsek_private.is_school_member(((storage.foldername(name))[1])::uuid));
