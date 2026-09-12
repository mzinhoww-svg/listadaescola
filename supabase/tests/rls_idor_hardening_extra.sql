-- Extensão de supabase/tests/rls_idor.sql (hardening pós-MVP). O
-- relatório de auditoria IDOR desta passada concluiu que o modelo de
-- segurança está correto (mesmo padrão de ownership repetido em todo o
-- schema), mas rls_idor.sql só exercita **uma** tabela representativa por
-- padrão (list_submissions para ownership de usuário, school_profiles/
-- stores para ownership de manager, campaigns para admin-only) -- nunca
-- as tabelas irmãs que compartilham a mesma policy. Este arquivo cobre as
-- lacunas de maior valor real apontadas nessa auditoria, sem duplicar o
-- que rls_idor.sql já prova:
--
--   1. reviews: User A não lê/altera review PENDING de User B (mesmo
--      padrão de list_submissions, nunca testado nesta tabela).
--   2. audit_logs: usuário comum não lê nada (trilha de auditoria só-admin).
--   3. school_images: School Manager A não insere para Escola B (cross-
--      school) E não pode atribuir submitted_by de outro usuário nem para
--      a própria escola A -- regressão direta do fix RN-004 desta mesma
--      sessão de hardening (school_images_manager_write agora exige
--      submitted_by = auth.uid()).
--   4. school_contacts: mesma checagem cross-school para uma tabela irmã
--      de school_profiles (já coberta em rls_idor.sql teste 09).
--   5. store_contacts/store_services: mesma checagem cross-store para
--      tabelas irmãs de stores (já coberta em rls_idor.sql teste 10).
--   6. storage.objects (bucket public-assets): School/Store Manager A não
--      escreve em schools/{escola-B}/... nem stores/{loja-B}/... --
--      nunca testado antes (só a tabela stores/school_profiles em si
--      tinha teste, não o Storage que o Achado 4 do final-audit.md trata).
--
-- Mesmo padrão de supabase/tests/rls_idor.sql: tudo dentro de uma
-- transação com ROLLBACK, nenhum dado de teste é commitado.

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'user-a-extra@test.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'user-b-extra@test.local', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin-extra@test.local', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'school-manager-a-extra@test.local', '{}'),
  ('55555555-5555-5555-5555-555555555555', 'store-manager-a-extra@test.local', '{}');

update public.profiles set role = 'ADMIN' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set role = 'SCHOOL_MANAGER' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set role = 'STORE_MANAGER' where id = '55555555-5555-5555-5555-555555555555';

insert into public.schools (id, inep_code, name, slug, uf, municipality, school_type, is_active) values
  ('a1111111-0000-0000-0000-000000000001', '11111102', 'Escola X Extra', 'escola-x-extra-test', 'MT', 'Cuiaba', 'PUBLIC', true),
  ('a2222222-0000-0000-0000-000000000002', '22222202', 'Escola Y Extra', 'escola-y-extra-test', 'MT', 'Cuiaba', 'PUBLIC', true);

insert into public.stores (id, name, slug, uf, municipality, whatsapp, is_active) values
  ('b1111111-0000-0000-0000-000000000001', 'Papelaria X Extra', 'papelaria-x-extra-test', 'MT', 'Cuiaba', '5565999999997', true),
  ('b2222222-0000-0000-0000-000000000002', 'Papelaria Y Extra', 'papelaria-y-extra-test', 'MT', 'Cuiaba', '5565999999996', true);

-- Manager A só gerencia a escola/loja "1" (X) -- nunca a "2" (Y).
insert into public.school_managers (school_id, profile_id) values
  ('a1111111-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444');
insert into public.store_managers (store_id, profile_id) values
  ('b1111111-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555');

insert into public.reviews (id, school_id, profile_id, rating, comment, status) values
  ('f1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 5, 'review de A', 'PENDING'),
  ('f2222222-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 4, 'review de B', 'PENDING');

insert into public.audit_logs (actor_id, action, entity_type, entity_id) values
  ('33333333-3333-3333-3333-333333333333', 'TEST_ACTION', 'schools', 'a1111111-0000-0000-0000-000000000001');

insert into public.school_contacts (school_id, contact_type, value) values
  ('a2222222-0000-0000-0000-000000000002', 'PHONE', '(65) 3000-0000');

insert into public.store_contacts (store_id, contact_type, value) values
  ('b2222222-0000-0000-0000-000000000002', 'PHONE', '(65) 3000-0001');
insert into public.store_services (store_id, service) values
  ('b2222222-0000-0000-0000-000000000002', 'entrega');

create temp table test_results (
  seq int generated always as identity,
  test_name text primary key,
  passed boolean,
  detail text
) on commit drop;
grant select, insert on test_results to authenticated, anon;

-- ============================================================
-- 1. User A x User B -- reviews (mesmo padrão de list_submissions,
--    nunca testado nesta tabela antes)
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '19_user_a_cannot_read_review_of_user_b',
  not exists (select 1 from public.reviews where id = 'f2222222-0000-0000-0000-000000000002'),
  'expect review de B invisível para A'
);
with attempt as (
  update public.reviews set comment = 'HACKED' where id = 'f2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '20_user_a_cannot_update_review_of_user_b', not exists (select 1 from attempt), 'expect 0 linhas atualizadas';
reset role;
select set_config('request.jwt.claims', '', true);
insert into test_results (test_name, passed, detail) values (
  '20b_review_de_b_inalterada',
  (select comment from public.reviews where id = 'f2222222-0000-0000-0000-000000000002') = 'review de B',
  'expect comment original preservado'
);

-- Controle positivo: A ainda enxerga a própria review.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '21_user_a_can_read_own_review',
  exists (select 1 from public.reviews where id = 'f1111111-0000-0000-0000-000000000001'),
  'expect própria review visível'
);
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- 2. User comum x recurso admin -- audit_logs (trilha de auditoria
--    nunca testada por um não-admin antes)
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '22_user_cannot_read_audit_logs',
  not exists (select 1 from public.audit_logs),
  'expect 0 linhas -- audit_logs é só-admin'
);
reset role;
select set_config('request.jwt.claims', '', true);

-- Controle positivo: admin lê normalmente.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
insert into test_results (test_name, passed, detail) values (
  '23_admin_can_read_audit_logs',
  exists (select 1 from public.audit_logs where entity_id = 'a1111111-0000-0000-0000-000000000001'),
  'expect admin enxerga audit_logs'
);
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- 3. School Manager A x Escola B -- school_images (cross-school) e
--    regressão do fix RN-004 (submitted_by = auth.uid() na própria escola)
-- ============================================================

-- 3a. Cross-school: A gerencia só a escola X, tenta inserir foto para Y.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','44444444-4444-4444-4444-444444444444','role','authenticated')::text, true);
do $$
begin
  begin
    insert into public.school_images (school_id, storage_path, submitted_by)
    values ('a2222222-0000-0000-0000-000000000002', 'schools/a2222222/foto.jpg', '44444444-4444-4444-4444-444444444444');
    insert into test_results (test_name, passed, detail) values (
      '24_school_manager_a_cannot_insert_image_for_school_b', false, 'insert deveria ter sido negado pela RLS'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      '24_school_manager_a_cannot_insert_image_for_school_b', true, sqlerrm
    );
  end;
end $$;

-- 3b. Regressão RN-004: A gerencia a escola X (própria), mas tenta
-- atribuir o upload a User B em vez de si mesmo -- deve falhar mesmo a
-- escola sendo a correta, porque school_images_manager_write agora exige
-- submitted_by = auth.uid() (fix desta mesma sessão de hardening).
do $$
begin
  begin
    insert into public.school_images (school_id, storage_path, submitted_by)
    values ('a1111111-0000-0000-0000-000000000001', 'schools/a1111111/foto.jpg', '22222222-2222-2222-2222-222222222222');
    insert into test_results (test_name, passed, detail) values (
      '25_school_manager_a_cannot_spoof_submitted_by_even_for_own_school', false, 'insert deveria ter sido negado pela RLS (RN-004)'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      '25_school_manager_a_cannot_spoof_submitted_by_even_for_own_school', true, sqlerrm
    );
  end;
end $$;

-- Controle positivo: A insere corretamente para a própria escola, com o
-- próprio id em submitted_by.
do $$
begin
  begin
    insert into public.school_images (school_id, storage_path, submitted_by)
    values ('a1111111-0000-0000-0000-000000000001', 'schools/a1111111/foto-ok.jpg', '44444444-4444-4444-4444-444444444444');
    insert into test_results (test_name, passed, detail) values (
      '26_school_manager_a_can_insert_image_for_own_school_as_self', true, 'insert permitido corretamente'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      '26_school_manager_a_can_insert_image_for_own_school_as_self', false, 'não deveria ter lançado: ' || sqlerrm
    );
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- 4. School Manager A x Escola B -- school_contacts (tabela irmã de
--    school_profiles, já coberta em rls_idor.sql teste 09)
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','44444444-4444-4444-4444-444444444444','role','authenticated')::text, true);
with attempt as (
  update public.school_contacts set value = 'HACKED' where school_id = 'a2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '27_school_manager_a_cannot_alter_contacts_of_school_b', not exists (select 1 from attempt), 'expect 0 linhas atualizadas';
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- 5. Store Manager A x Loja B -- store_contacts/store_services (tabelas
--    irmãs de stores, já coberta em rls_idor.sql teste 10)
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','55555555-5555-5555-5555-555555555555','role','authenticated')::text, true);
with attempt as (
  update public.store_contacts set value = 'HACKED' where store_id = 'b2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '28_store_manager_a_cannot_alter_contacts_of_store_b', not exists (select 1 from attempt), 'expect 0 linhas atualizadas';

with attempt as (
  delete from public.store_services where store_id = 'b2222222-0000-0000-0000-000000000002' returning 1
)
insert into test_results (test_name, passed, detail)
select '29_store_manager_a_cannot_delete_service_of_store_b', not exists (select 1 from attempt), 'expect 0 linhas removidas';
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- 6. Storage (bucket public-assets) -- nunca testado antes. Achado 4 do
--    final-audit.md trata o SELECT (sem gate de aprovação); aqui o alvo é
--    a escrita, que deveria ser (e é) escopada por entidade.
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','44444444-4444-4444-4444-444444444444','role','authenticated')::text, true);
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('public-assets', 'schools/a2222222-0000-0000-0000-000000000002/foto.jpg', '44444444-4444-4444-4444-444444444444');
    insert into test_results (test_name, passed, detail) values (
      '30_school_manager_a_cannot_write_storage_for_school_b', false, 'insert deveria ter sido negado pela RLS'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      '30_school_manager_a_cannot_write_storage_for_school_b', true, sqlerrm
    );
  end;
end $$;
-- Controle positivo: A escreve normalmente para a própria escola.
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('public-assets', 'schools/a1111111-0000-0000-0000-000000000001/foto.jpg', '44444444-4444-4444-4444-444444444444');
    insert into test_results (test_name, passed, detail) values (
      '31_school_manager_a_can_write_storage_for_own_school', true, 'insert permitido corretamente'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      '31_school_manager_a_can_write_storage_for_own_school', false, 'não deveria ter lançado: ' || sqlerrm
    );
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '', true);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','55555555-5555-5555-5555-555555555555','role','authenticated')::text, true);
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('public-assets', 'stores/b2222222-0000-0000-0000-000000000002/foto.jpg', '55555555-5555-5555-5555-555555555555');
    insert into test_results (test_name, passed, detail) values (
      '32_store_manager_a_cannot_write_storage_for_store_b', false, 'insert deveria ter sido negado pela RLS'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      '32_store_manager_a_cannot_write_storage_for_store_b', true, sqlerrm
    );
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- Resultado
-- ============================================================

select
  count(*) as total,
  count(*) filter (where passed) as passed,
  count(*) filter (where not passed) as failed
from test_results;

select test_name, passed, detail from test_results order by seq;

rollback;
