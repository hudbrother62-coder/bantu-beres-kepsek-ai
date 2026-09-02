begin;
select plan(16);

select has_table('public','kepsek_profiles','kepsek profile table exists');
select has_table('public','kepsek_schools','kepsek school table exists');
select has_table('public','kepsek_projects','kepsek projects table exists');
select has_table('public','kepsek_sources','kepsek sources table exists');
select has_table('public','kepsek_documents','kepsek documents table exists');
select has_table('public','kepsek_document_versions','kepsek document versions table exists');
select has_table('public','kepsek_agendas','kepsek agendas table exists');
select has_table('public','kepsek_subscriptions','kepsek subscriptions table exists');

select policies_are('public','kepsek_projects',array['kepsek_projects_delete_own','kepsek_projects_insert_own','kepsek_projects_select_own','kepsek_projects_update_own']);
select policies_are('public','kepsek_sources',array['kepsek_sources_delete_own','kepsek_sources_insert_own','kepsek_sources_select_own','kepsek_sources_update_own']);
select policies_are('public','kepsek_documents',array['kepsek_documents_delete_own','kepsek_documents_insert_own','kepsek_documents_select_own','kepsek_documents_update_own']);
select policies_are('public','kepsek_agendas',array['kepsek_agendas_delete_own','kepsek_agendas_insert_own','kepsek_agendas_select_own','kepsek_agendas_update_own']);
select policies_are('public','kepsek_document_versions',array['kepsek_versions_select_own']);
select policies_are('public','kepsek_subscriptions',array['kepsek_subscriptions_select_own']);

select ok((select relrowsecurity from pg_class where oid='public.kepsek_documents'::regclass),'RLS enabled on documents');
select ok((select not public from storage.buckets where id='kepsek-school-files'),'storage bucket is private');

select * from finish();
rollback;
