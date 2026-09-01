create index kepsek_generation_groups_school_idx
  on public.kepsek_generation_groups (school_id);

create index kepsek_generation_groups_user_created_idx
  on public.kepsek_generation_groups (user_id, created_at desc);

create index kepsek_generations_group_idx
  on public.kepsek_generations (group_id, variant_number desc);

create index kepsek_generations_school_idx
  on public.kepsek_generations (school_id);

create index kepsek_generations_user_created_idx
  on public.kepsek_generations (user_id, created_at desc);
