-- Per-user BYOK storage. Values are ciphertext produced by the Vercel server.
create table if not exists public.kepsek_user_ai_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini')),
  encrypted_key text not null check (char_length(encrypted_key) between 40 and 1200),
  key_hint text not null check (char_length(key_hint) between 8 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.kepsek_user_ai_keys enable row level security;
revoke all on public.kepsek_user_ai_keys from public, anon;
grant select, insert, update, delete on public.kepsek_user_ai_keys to authenticated;
drop policy if exists kepsek_user_ai_keys_self on public.kepsek_user_ai_keys;
create policy kepsek_user_ai_keys_self on public.kepsek_user_ai_keys
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists kepsek_user_ai_keys_updated_at on public.kepsek_user_ai_keys;
create trigger kepsek_user_ai_keys_updated_at before update on public.kepsek_user_ai_keys
  for each row execute function kepsek_private.set_updated_at();
