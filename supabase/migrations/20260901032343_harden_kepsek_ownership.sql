drop policy if exists kepsek_groups_update_own
  on public.kepsek_generation_groups;

create policy kepsek_groups_update_own on public.kepsek_generation_groups
for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.kepsek_schools as school
    where school.id = kepsek_generation_groups.school_id
      and school.owner_user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.kepsek_schools as school
    where school.id = kepsek_generation_groups.school_id
      and school.owner_user_id = (select auth.uid())
  )
);

drop policy if exists kepsek_generations_insert_own
  on public.kepsek_generations;
drop policy if exists kepsek_generations_update_own
  on public.kepsek_generations;

create policy kepsek_generations_insert_own on public.kepsek_generations
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.kepsek_generation_groups as generation_group
    where generation_group.id = kepsek_generations.group_id
      and generation_group.user_id = (select auth.uid())
      and generation_group.school_id = kepsek_generations.school_id
  )
  and exists (
    select 1 from public.kepsek_schools as school
    where school.id = kepsek_generations.school_id
      and school.owner_user_id = (select auth.uid())
  )
);

create policy kepsek_generations_update_own on public.kepsek_generations
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.kepsek_generation_groups as generation_group
    where generation_group.id = kepsek_generations.group_id
      and generation_group.user_id = (select auth.uid())
      and generation_group.school_id = kepsek_generations.school_id
  )
  and exists (
    select 1 from public.kepsek_schools as school
    where school.id = kepsek_generations.school_id
      and school.owner_user_id = (select auth.uid())
  )
);
