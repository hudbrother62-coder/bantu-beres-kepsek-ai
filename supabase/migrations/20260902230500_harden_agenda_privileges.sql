-- Agenda is managed only through row-scoped CRUD operations.
-- TRUNCATE bypasses row-level security, so it must never be available to app users.
revoke truncate, references, trigger on table public.kepsek_agendas from authenticated;

