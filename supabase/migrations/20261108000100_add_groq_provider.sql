-- Non-destructive expansion: preserve legacy Gemini rows, allow Groq BYOK rows.
alter table public.kepsek_user_ai_keys
  drop constraint if exists kepsek_user_ai_keys_provider_check;
alter table public.kepsek_user_ai_keys
  add constraint kepsek_user_ai_keys_provider_check check (provider in ('gemini','groq'));
