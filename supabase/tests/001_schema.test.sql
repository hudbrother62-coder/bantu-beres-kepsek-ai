begin;
select plan(24);

select has_table('public','kepsek_profiles','kepsek profile table exists');
select has_table('public','kepsek_schools','kepsek school table exists');
select has_table('public','kepsek_projects','kepsek projects table exists');
select has_table('public','kepsek_sources','kepsek sources table exists');
select has_table('public','kepsek_documents','kepsek documents table exists');
select has_table('public','kepsek_document_versions','kepsek document versions table exists');
select has_table('public','kepsek_agendas','kepsek agendas table exists');
select has_table('public','kepsek_subscriptions','kepsek subscriptions table exists');
select has_table('public','kepsek_assistant_messages','kepsek assistant messages table exists');
select has_table('public','kepsek_workspace_members','kepsek workspace members table exists');
select has_table('public','kepsek_workspace_invites','kepsek workspace invites table exists');
select has_table('public','kepsek_template_folders','kepsek template folders table exists');

select policies_are('public','kepsek_projects',array['kepsek_projects_delete_workspace','kepsek_projects_insert_workspace','kepsek_projects_select_workspace','kepsek_projects_update_workspace']);
select policies_are('public','kepsek_sources',array['kepsek_sources_delete_workspace','kepsek_sources_insert_workspace','kepsek_sources_select_workspace','kepsek_sources_update_workspace']);
select policies_are('public','kepsek_documents',array['kepsek_documents_delete_workspace','kepsek_documents_insert_workspace','kepsek_documents_select_workspace','kepsek_documents_update_workspace']);
select policies_are('public','kepsek_agendas',array['kepsek_agendas_delete_workspace','kepsek_agendas_insert_workspace','kepsek_agendas_select_workspace','kepsek_agendas_update_workspace']);
select policies_are('public','kepsek_document_versions',array['kepsek_versions_select_workspace']);
select policies_are('public','kepsek_subscriptions',array['kepsek_subscriptions_select_workspace']);
select policies_are('public','kepsek_assistant_messages',array['kepsek_assistant_messages_delete_self','kepsek_assistant_messages_insert_self','kepsek_assistant_messages_select_self']);
select policies_are('public','kepsek_workspace_members',array['kepsek_workspace_members_delete_owner','kepsek_workspace_members_select_school']);
select policies_are('public','kepsek_workspace_invites',array['kepsek_workspace_invites_delete_owner','kepsek_workspace_invites_insert_owner','kepsek_workspace_invites_select_owner']);
select policies_are('public','kepsek_template_folders',array['kepsek_template_folders_delete_workspace','kepsek_template_folders_insert_workspace','kepsek_template_folders_select_workspace','kepsek_template_folders_update_workspace']);

select ok((select relrowsecurity from pg_class where oid='public.kepsek_documents'::regclass),'RLS enabled on documents');
select ok((select not public from storage.buckets where id='kepsek-school-files'),'storage bucket is private');

select * from finish();
rollback;
