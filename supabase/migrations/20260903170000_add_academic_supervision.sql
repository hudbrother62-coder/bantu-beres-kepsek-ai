-- Operational academic supervision for each school workspace.

create table if not exists public.kepsek_teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  full_name text not null check (char_length(full_name) between 2 and 160),
  nip text check (nip is null or char_length(nip) <= 40),
  subject text check (subject is null or char_length(subject) <= 160),
  class_assignment text check (class_assignment is null or char_length(class_assignment) <= 160),
  status text not null default 'active' check (status in ('active','inactive')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kepsek_supervisions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.kepsek_schools(id) on delete cascade,
  teacher_id uuid not null references public.kepsek_teachers(id) on delete restrict,
  supervisor_id uuid not null references auth.users(id) on delete restrict,
  instrument_key text not null check (instrument_key in ('atp','module','administration','implementation')),
  scheduled_at timestamptz not null default now(),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','follow_up')),
  class_semester text check (class_semester is null or char_length(class_semester) <= 120),
  subject text check (subject is null or char_length(subject) <= 160),
  topic text check (topic is null or char_length(topic) <= 300),
  contact_hours text check (contact_hours is null or char_length(contact_hours) <= 80),
  responses jsonb not null default '{}'::jsonb check (jsonb_typeof(responses) = 'object'),
  total_score integer not null default 0 check (total_score >= 0),
  max_score integer not null default 1 check (max_score > 0),
  final_score numeric(5,2) not null default 0 check (final_score between 0 and 100),
  rating text not null default 'Perlu Pembinaan' check (rating in ('Sangat Baik','Baik','Cukup','Perlu Pembinaan')),
  overall_notes text,
  follow_up text,
  source_url text check (source_url is null or source_url ~ '^https://drive\.google\.com/'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kepsek_teachers_school_name_idx on public.kepsek_teachers(school_id,full_name);
create index if not exists kepsek_teachers_created_by_idx on public.kepsek_teachers(created_by);
create index if not exists kepsek_supervisions_school_date_idx on public.kepsek_supervisions(school_id,scheduled_at desc);
create index if not exists kepsek_supervisions_teacher_idx on public.kepsek_supervisions(teacher_id,scheduled_at desc);
create index if not exists kepsek_supervisions_supervisor_idx on public.kepsek_supervisions(supervisor_id);

drop trigger if exists kepsek_teachers_updated_at on public.kepsek_teachers;
create trigger kepsek_teachers_updated_at before update on public.kepsek_teachers
for each row execute function kepsek_private.set_updated_at();
drop trigger if exists kepsek_supervisions_updated_at on public.kepsek_supervisions;
create trigger kepsek_supervisions_updated_at before update on public.kepsek_supervisions
for each row execute function kepsek_private.set_updated_at();

alter table public.kepsek_teachers enable row level security;
alter table public.kepsek_supervisions enable row level security;

revoke all on public.kepsek_teachers, public.kepsek_supervisions from public, anon;
grant select, insert, update, delete on public.kepsek_teachers, public.kepsek_supervisions to authenticated;

create policy kepsek_teachers_select_workspace on public.kepsek_teachers for select to authenticated
using (kepsek_private.is_school_member(school_id));
create policy kepsek_teachers_insert_workspace on public.kepsek_teachers for insert to authenticated
with check (created_by = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_teachers_update_workspace on public.kepsek_teachers for update to authenticated
using (kepsek_private.is_school_member(school_id)) with check (kepsek_private.is_school_member(school_id));
create policy kepsek_teachers_delete_workspace on public.kepsek_teachers for delete to authenticated
using (kepsek_private.is_school_member(school_id));

create policy kepsek_supervisions_select_workspace on public.kepsek_supervisions for select to authenticated
using (kepsek_private.is_school_member(school_id));
create policy kepsek_supervisions_insert_workspace on public.kepsek_supervisions for insert to authenticated
with check (supervisor_id = (select auth.uid()) and kepsek_private.is_school_member(school_id));
create policy kepsek_supervisions_update_workspace on public.kepsek_supervisions for update to authenticated
using (kepsek_private.is_school_member(school_id)) with check (kepsek_private.is_school_member(school_id));
create policy kepsek_supervisions_delete_workspace on public.kepsek_supervisions for delete to authenticated
using (kepsek_private.is_school_member(school_id));

