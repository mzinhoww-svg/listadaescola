-- RLS / IDOR test suite for Prompt 02.
--
-- Runs entirely inside one transaction that ends in ROLLBACK -- no
-- fixture or test data is ever committed. Verified against the real
-- listada-escola Supabase project (all 26 assertions passing) before
-- being committed; re-run it after any RLS/schema change:
--
--   via Supabase MCP: execute_sql with this file's contents (not
--   apply_migration -- this is a verification script, not a migration)
--   via psql: psql "$DATABASE_URL" -f supabase/tests/rls_idor.sql
--
-- Covers the 10 required tests from docs/security/rls.md ("Testes de
-- seguranca obrigatorios") plus positive controls (making sure access
-- that SHOULD work still works) and storage.objects-level isolation.
--
-- Gotcha this suite exists to document: when an UPDATE's USING clause
-- matches a row (e.g. a user updating their OWN profile) but WITH CHECK
-- then rejects the new values (e.g. changing role), Postgres raises a
-- hard "new row violates row-level security policy" error -- it does
-- NOT silently no-op like it does when USING excludes the row entirely.
-- Tests that hit that path (04, 05) catch the exception explicitly;
-- every other negative test asserts 0 rows affected.

begin;

-- ============================================================
-- Fixtures (created via the privileged connection, bypasses RLS)
-- ============================================================

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.local', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'school-manager-a@test.local', '{}'),
  ('55555555-5555-5555-5555-555555555555', 'store-manager-a@test.local', '{}');

update public.profiles set role = 'ADMIN' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set role = 'SCHOOL_MANAGER' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set role = 'STORE_MANAGER' where id = '55555555-5555-5555-5555-555555555555';

insert into public.schools (id, inep_code, name, slug, uf, municipality, school_type, is_active) values
  ('a1111111-0000-0000-0000-000000000001', '11111111', 'Escola X', 'escola-x-test', 'MT', 'Cuiaba', 'PUBLIC', true),
  ('a2222222-0000-0000-0000-000000000002', '22222222', 'Escola Y', 'escola-y-test', 'MT', 'Cuiaba', 'PUBLIC', true);

insert into public.school_profiles (school_id) values
  ('a1111111-0000-0000-0000-000000000001'),
  ('a2222222-0000-0000-0000-000000000002');

insert into public.stores (id, name, slug, uf, municipality, whatsapp, is_active) values
  ('b1111111-0000-0000-0000-000000000001', 'Papelaria X', 'papelaria-x-test', 'MT', 'Cuiaba', '5565999999999', true),
  ('b2222222-0000-0000-0000-000000000002', 'Papelaria Y', 'papelaria-y-test', 'MT', 'Cuiaba', '5565999999998', true);

insert into public.school_managers (school_id, profile_id) values
  ('a1111111-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444');

insert into public.store_managers (store_id, profile_id) values
  ('b1111111-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555');

insert into public.list_submissions (id, school_id, submitted_by, education_level, series_name, school_year, status) values
  ('c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'FUNDAMENTAL_1', '1o ano', 2026, 'DRAFT'),
  ('c2222222-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'FUNDAMENTAL_1', '2o ano', 2026, 'DRAFT'),
  ('c3333333-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'FUNDAMENTAL_1', '3o ano', 2026, 'SUBMITTED');

insert into public.submission_items (submission_id, name, quantity) values
  ('c3333333-0000-0000-0000-000000000003', 'Caderno', 2);

insert into public.submission_attachments (id, submission_id, storage_path, file_name, mime_type, size_bytes, uploaded_by) values
  ('d2222222-0000-0000-0000-000000000002', 'c2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222/c2222222/doc.pdf', 'doc.pdf', 'application/pdf', 1000, '22222222-2222-2222-2222-222222222222');

insert into public.campaigns (id, entity_type, entity_id, starts_at, ends_at, status) values
  ('e1111111-0000-0000-0000-000000000001', 'SCHOOL', 'a1111111-0000-0000-0000-000000000001', now(), now() + interval '30 days', 'ACTIVE');

insert into storage.objects (bucket_id, name, owner) values
  ('submissions', '22222222-2222-2222-2222-222222222222/c2222222/doc.pdf', '22222222-2222-2222-2222-222222222222');

create temp table test_results (
  seq int generated always as identity,
  test_name text primary key,
  passed boolean,
  detail text
) on commit drop;

-- The role-switch below (authenticated/anon) needs explicit privileges on
-- this temp table -- table creation only grants the owning (superuser)
-- role access by default.
grant select, insert on test_results to authenticated, anon;

-- ============================================================
-- Required tests from docs/security/rls.md
-- ============================================================

-- 1. Usuario A nao le submission B
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '01_user_a_cannot_read_submission_b',
  not exists (select 1 from public.list_submissions where id = 'c2222222-0000-0000-0000-000000000002'),
  'expect submission B invisible to A'
);
reset role;
select set_config('request.jwt.claims', '', true);

-- 2. Usuario A nao altera submission B
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
with attempt as (
  update public.list_submissions set series_name = 'HACKED' where id = 'c2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '02_user_a_cannot_update_submission_b', not exists (select 1 from attempt), 'expect 0 rows updated';
reset role;
select set_config('request.jwt.claims', '', true);
insert into test_results (test_name, passed, detail) values (
  '02b_submission_b_unchanged_after_attempt',
  (select series_name from public.list_submissions where id = 'c2222222-0000-0000-0000-000000000002') = '2o ano',
  'expect series_name still original'
);

-- 3. Usuario A nao exclui submission B
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
with attempt as (
  delete from public.list_submissions where id = 'c2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '03_user_a_cannot_delete_submission_b', not exists (select 1 from attempt), 'expect 0 rows deleted';
reset role;
select set_config('request.jwt.claims', '', true);
insert into test_results (test_name, passed, detail) values (
  '03b_submission_b_still_exists',
  exists (select 1 from public.list_submissions where id = 'c2222222-0000-0000-0000-000000000002'),
  'expect submission B still present'
);

-- 4. Usuario comum nao altera role de profile
--
-- USING (id = auth.uid()) matches their own row, so this doesn't fail
-- silently with 0 rows -- Postgres raises a hard RLS-violation error once
-- USING passes but WITH CHECK then rejects the new value. That's actually
-- the stronger, correct behavior; the test just needs to expect it.
do $$
declare
  v_caught boolean := false;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
  begin
    update public.profiles set role = 'ADMIN' where id = '11111111-1111-1111-1111-111111111111';
  exception when others then
    v_caught := true;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into test_results (test_name, passed, detail)
  values ('04_user_cannot_change_own_role', v_caught, 'expect WITH CHECK to raise when role is changed on own row');
end $$;
insert into test_results (test_name, passed, detail) values (
  '04b_user_a_role_still_user',
  (select role from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'USER',
  'expect role unchanged'
);

-- 5. Usuario comum nao aprova lista
do $$
declare
  v_caught boolean := false;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
  begin
    perform public.approve_submission('c3333333-0000-0000-0000-000000000003');
  exception when others then
    v_caught := true;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into test_results (test_name, passed, detail)
  values ('05_user_cannot_approve_submission', v_caught, 'expect approve_submission to raise for non-admin');
end $$;

-- 6. Usuario comum nao altera campanha
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
with attempt as (
  update public.campaigns set priority = 999 where id = 'e1111111-0000-0000-0000-000000000001' returning 1
)
insert into test_results (test_name, passed, detail)
select '06_user_cannot_alter_campaign', not exists (select 1 from attempt), 'expect 0 rows updated';
reset role;
select set_config('request.jwt.claims', '', true);

-- 7. Usuario comum nao altera escola INEP
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
with attempt as (
  update public.schools set name = 'HACKED' where id = 'a1111111-0000-0000-0000-000000000001' returning 1
)
insert into test_results (test_name, passed, detail)
select '07_user_cannot_alter_school', not exists (select 1 from attempt), 'expect 0 rows updated';
reset role;
select set_config('request.jwt.claims', '', true);

-- 8. Usuario comum nao acessa attachment privado de outro usuario
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '08_user_a_cannot_read_attachment_of_user_b',
  not exists (select 1 from public.submission_attachments where id = 'd2222222-0000-0000-0000-000000000002'),
  'expect attachment row invisible'
);
insert into test_results (test_name, passed, detail) values (
  '08b_user_a_cannot_see_storage_object_of_user_b',
  not exists (select 1 from storage.objects where bucket_id = 'submissions' and name = '22222222-2222-2222-2222-222222222222/c2222222/doc.pdf'),
  'expect storage.objects row invisible'
);
reset role;
select set_config('request.jwt.claims', '', true);

-- 9. School Manager A nao altera school B
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','44444444-4444-4444-4444-444444444444','role','authenticated')::text, true);
with attempt as (
  update public.school_profiles set description = 'HACKED' where school_id = 'a2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '09_school_manager_a_cannot_alter_school_b', not exists (select 1 from attempt), 'expect 0 rows updated';
reset role;
select set_config('request.jwt.claims', '', true);

-- 10. Store Manager A nao altera store B
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','55555555-5555-5555-5555-555555555555','role','authenticated')::text, true);
with attempt as (
  update public.stores set name = 'HACKED' where id = 'b2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '10_store_manager_a_cannot_alter_store_b', not exists (select 1 from attempt), 'expect 0 rows updated';
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- Positive controls -- make sure the above zeros are RLS working,
-- not everything being broken/inaccessible to everyone.
-- ============================================================

-- 11/12. user A can read + update their OWN draft submission
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '11_user_a_can_read_own_submission',
  exists (select 1 from public.list_submissions where id = 'c1111111-0000-0000-0000-000000000001'),
  'expect own submission visible'
);
with attempt as (
  update public.list_submissions set series_name = '1o ano editado' where id = 'c1111111-0000-0000-0000-000000000001' returning 1
)
insert into test_results (test_name, passed, detail)
select '12_user_a_can_update_own_draft_submission', exists (select 1 from attempt), 'expect 1 row updated';
reset role;
select set_config('request.jwt.claims', '', true);

-- 13. school manager A CAN update their own school
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','44444444-4444-4444-4444-444444444444','role','authenticated')::text, true);
with attempt as (
  update public.school_profiles set description = 'Editado pelo gestor' where school_id = 'a1111111-0000-0000-0000-000000000001' returning 1
)
insert into test_results (test_name, passed, detail)
select '13_school_manager_a_can_update_own_school', exists (select 1 from attempt), 'expect 1 row updated';
reset role;
select set_config('request.jwt.claims', '', true);

-- 14. admin can read any submission
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '14_admin_can_read_any_submission',
  exists (select 1 from public.list_submissions where id = 'c2222222-0000-0000-0000-000000000002'),
  'expect admin sees user B submission'
);

-- 15. admin CAN approve a submitted submission, end to end
do $$
declare
  v_version_id uuid;
begin
  v_version_id := public.approve_submission('c3333333-0000-0000-0000-000000000003');
  insert into test_results (test_name, passed, detail) values (
    '15_admin_can_approve_submission',
    v_version_id is not null,
    'expect approve_submission to return a new version id'
  );
end $$;
reset role;
select set_config('request.jwt.claims', '', true);

insert into test_results (test_name, passed, detail) values (
  '15b_approved_submission_status_updated',
  (select status from public.list_submissions where id = 'c3333333-0000-0000-0000-000000000003') = 'APPROVED',
  'expect status APPROVED'
);
insert into test_results (test_name, passed, detail) values (
  '15c_school_list_created_with_item',
  exists (
    select 1 from public.school_lists l
    join public.school_list_versions v on v.school_list_id = l.id
    join public.school_list_items i on i.school_list_version_id = v.id
    where l.school_id = 'a1111111-0000-0000-0000-000000000001' and i.name = 'Caderno'
  ),
  'expect school_lists/versions/items chain populated from the submission'
);
insert into test_results (test_name, passed, detail) values (
  '15d_audit_log_recorded',
  exists (select 1 from public.audit_logs where entity_id = 'c3333333-0000-0000-0000-000000000003' and action = 'APPROVE_SUBMISSION'),
  'expect audit log row'
);

-- 16/17/18. anon: no submissions, no profiles, but active schools are public
set local role anon;
select set_config('request.jwt.claims', '', true);
insert into test_results (test_name, passed, detail) values (
  '16_anon_cannot_read_submissions',
  not exists (select 1 from public.list_submissions),
  'expect 0 rows for anon'
);
insert into test_results (test_name, passed, detail) values (
  '17_anon_cannot_read_profiles',
  not exists (select 1 from public.profiles),
  'expect 0 rows for anon'
);
insert into test_results (test_name, passed, detail) values (
  '18_anon_can_read_active_school',
  exists (select 1 from public.schools where id = 'a1111111-0000-0000-0000-000000000001'),
  'expect active school visible to anon'
);
with attempt as (
  update public.schools set name = 'HACKED_ANON' where id = 'a1111111-0000-0000-0000-000000000001' returning 1
)
insert into test_results (test_name, passed, detail)
select '18b_anon_cannot_write_schools', not exists (select 1 from attempt), 'expect 0 rows updated (no policy grants anon write at all)';
reset role;

-- ============================================================
-- Report (detailed list last, so it's what comes back if only the
-- final statement's result set is returned)
-- ============================================================
select
  count(*) as total,
  count(*) filter (where passed) as passed,
  count(*) filter (where not passed) as failed
from test_results;

select test_name, passed, detail from test_results order by seq;

rollback;
