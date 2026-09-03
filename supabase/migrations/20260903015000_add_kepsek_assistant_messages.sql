-- Private chat history for the school-owner assistant.
create table if not exists public.kepsek_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 30000),
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kepsek_assistant_messages_school_created_idx
  on public.kepsek_assistant_messages(school_id, created_at desc);
create index if not exists kepsek_assistant_messages_user_idx
  on public.kepsek_assistant_messages(user_id);

alter table public.kepsek_assistant_messages enable row level security;

revoke all on public.kepsek_assistant_messages from public, anon;
grant select, insert, delete on public.kepsek_assistant_messages to authenticated;
revoke update, truncate, references, trigger on public.kepsek_assistant_messages from authenticated;

drop policy if exists kepsek_assistant_messages_select_own on public.kepsek_assistant_messages;
drop policy if exists kepsek_assistant_messages_insert_own on public.kepsek_assistant_messages;
drop policy if exists kepsek_assistant_messages_delete_own on public.kepsek_assistant_messages;

create policy kepsek_assistant_messages_select_own
on public.kepsek_assistant_messages
for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.kepsek_schools school
    where school.id = school_id
      and school.owner_user_id = (select auth.uid())
  )
);

create policy kepsek_assistant_messages_insert_own
on public.kepsek_assistant_messages
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.kepsek_schools school
    where school.id = school_id
      and school.owner_user_id = (select auth.uid())
  )
);

create policy kepsek_assistant_messages_delete_own
on public.kepsek_assistant_messages
for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.kepsek_schools school
    where school.id = school_id
      and school.owner_user_id = (select auth.uid())
  )
);
