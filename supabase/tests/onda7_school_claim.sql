-- Onda 7 -- prova de RLS e das guardas de
-- supabase/migrations/20260913040000_school_claim_and_publish.sql.
--
-- Roda inteiro dentro de UMA transação que termina em ROLLBACK -- nenhuma
-- linha de fixture é gravada. Mesmo padrão (e mesmas armadilhas
-- documentadas) de supabase/tests/rls_idor.sql:
--
--   via Supabase MCP: execute_sql com o conteúdo deste arquivo
--   via psql:         psql "$DATABASE_URL" -f supabase/tests/onda7_school_claim.sql
--
-- Armadilha que este arquivo herda do rls_idor.sql: quando o USING de um
-- UPDATE casa a linha mas o WITH CHECK recusa os valores novos, o Postgres
-- levanta exceção -- não faz no-op silencioso. Os testes que batem nesse
-- caminho capturam a exceção; os demais afirmam 0 linhas afetadas.
--
-- Armadilha específica desta onda: `school_profiles_protect_admin_columns`
-- e `school_images_protect_admin_columns` NÃO recusam a escrita -- elas
-- restauram a coluna em silêncio (mesma escolha de
-- stores_protect_admin_columns, Onda 6). Então o teste correto é "o UPDATE
-- passa E o valor não mudou", não "o UPDATE falhou".
--
-- Última execução contra o projeto real (listada-escola,
-- wfdejmokxrunupsekcmq) em 2026-09-13: 32/32 passando.

begin;

-- ============================================================
-- Fixtures (conexão privilegiada, ignora RLS)
-- ============================================================

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000001-0000-0000-0000-000000000001', 'onda7-gestor-a@test.local', '{}'),
  ('a0000002-0000-0000-0000-000000000002', 'onda7-gestor-b@test.local', '{}'),
  ('a0000003-0000-0000-0000-000000000003', 'onda7-comum@test.local', '{}'),
  ('a0000004-0000-0000-0000-000000000004', 'onda7-admin@test.local', '{}');

update public.profiles set role = 'ADMIN' where id = 'a0000004-0000-0000-0000-000000000004';

insert into public.schools (id, inep_code, name, slug, uf, municipality, school_type, address, phone, is_active) values
  ('50000001-0000-0000-0000-000000000001', '90000001', 'Escola Onda7 A', 'onda7-escola-a-test', 'MT', 'Cuiaba', 'PUBLIC', 'Rua A, 1', '(65) 3333-0001', true),
  ('50000002-0000-0000-0000-000000000002', '90000002', 'Escola Onda7 B', 'onda7-escola-b-test', 'MT', 'Cuiaba', 'PUBLIC', 'Rua B, 2', '(65) 3333-0002', true);

insert into public.school_profiles (school_id) values
  ('50000001-0000-0000-0000-000000000001'),
  ('50000002-0000-0000-0000-000000000002');

create temp table t (
  seq int generated always as identity,
  name text primary key,
  passed boolean,
  detail text
) on commit drop;

grant select, insert on t to authenticated, anon;

-- ============================================================
-- A. Reivindicação: quem pode criar, quem pode ler
-- ============================================================

-- A1. Usuário autenticado cria a própria reivindicação.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
insert into public.school_claims (id, school_id, claimed_by, claimant_name, claimant_role, institutional_contact, justification)
values ('c0000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
        'Maria da Silva', 'Diretora', '(65) 3333-0001', 'Sou diretora desta escola desde 2019 e quero manter a lista de material atualizada.');
insert into t (name, passed, detail)
select 'A1_usuario_cria_propria_reivindicacao',
       exists (select 1 from public.school_claims where id = 'c0000001-0000-0000-0000-000000000001'),
       'INSERT proprio deve passar';
reset role;
select set_config('request.jwt.claims', '', true);

-- A2. Usuário NÃO cria reivindicação em nome de outra pessoa.
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000003-0000-0000-0000-000000000003','role','authenticated')::text, true);
  begin
    insert into public.school_claims (school_id, claimed_by, claimant_name, claimant_role, institutional_contact, justification)
    values ('50000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
            'Fake', 'Diretor', 'contato@escola.test', 'Justificativa suficientemente longa para passar no check.');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('A2_nao_reivindica_em_nome_de_outro', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- A3. Usuário NÃO nasce aprovado (WITH CHECK fixa o estado inicial).
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000003-0000-0000-0000-000000000003','role','authenticated')::text, true);
  begin
    insert into public.school_claims (school_id, claimed_by, claimant_name, claimant_role, institutional_contact, justification, status)
    values ('50000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003',
            'Esperto', 'Diretor', 'contato@escola.test', 'Justificativa suficientemente longa para passar no check.', 'APPROVED');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('A3_nao_nasce_aprovado', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- A4. Usuário NÃO lê reivindicação alheia (sem oráculo).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000003-0000-0000-0000-000000000003','role','authenticated')::text, true);
insert into t (name, passed, detail)
select 'A4_nao_le_reivindicacao_alheia',
       not exists (select 1 from public.school_claims where id = 'c0000001-0000-0000-0000-000000000001'),
       'SELECT de reivindicacao de outro deve devolver 0 linhas';
reset role;
select set_config('request.jwt.claims', '', true);

-- A5. Dona lê a própria (controle positivo).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
insert into t (name, passed, detail)
select 'A5_le_a_propria_reivindicacao',
       exists (select 1 from public.school_claims where id = 'c0000001-0000-0000-0000-000000000001'),
       'controle positivo';
reset role;
select set_config('request.jwt.claims', '', true);

-- A6. Duas reivindicações PENDENTES da mesma pessoa para a mesma escola.
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
  begin
    insert into public.school_claims (school_id, claimed_by, claimant_name, claimant_role, institutional_contact, justification)
    values ('50000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
            'Maria da Silva', 'Diretora', '(65) 3333-0001', 'Segunda tentativa com justificativa longa o bastante.');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('A6_bloqueia_segunda_pendente', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- ============================================================
-- B. Decisão do admin
-- ============================================================

-- B1. Não-admin não aprova.
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000003-0000-0000-0000-000000000003','role','authenticated')::text, true);
  begin
    perform public.approve_school_claim('c0000001-0000-0000-0000-000000000001');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('B1_nao_admin_nao_aprova', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- B2. Admin não decide a PRÓPRIA reivindicação (guarda de auto-revisão).
insert into public.school_claims (id, school_id, claimed_by, claimant_name, claimant_role, institutional_contact, justification)
values ('c0000009-0000-0000-0000-000000000009', '50000002-0000-0000-0000-000000000002', 'a0000004-0000-0000-0000-000000000004',
        'Admin Interessado', 'Diretor', 'contato@escola.test', 'Justificativa suficientemente longa para passar no check.');
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000004-0000-0000-0000-000000000004','role','authenticated')::text, true);
  begin
    perform public.approve_school_claim('c0000009-0000-0000-0000-000000000009');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('B2_admin_nao_aprova_a_propria', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- B3. Rejeição sem motivo é recusada.
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000004-0000-0000-0000-000000000004','role','authenticated')::text, true);
  begin
    perform public.reject_school_claim('c0000001-0000-0000-0000-000000000001', '   ');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('B3_rejeicao_exige_motivo', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- B4. Admin aprova: cria vínculo, promove papel, grava auditoria.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000004-0000-0000-0000-000000000004','role','authenticated')::text, true);
select public.approve_school_claim('c0000001-0000-0000-0000-000000000001');
reset role;
select set_config('request.jwt.claims', '', true);

insert into t (name, passed, detail)
select 'B4a_vinculo_criado',
       exists (select 1 from public.school_managers
               where school_id = '50000001-0000-0000-0000-000000000001'
                 and profile_id = 'a0000001-0000-0000-0000-000000000001'),
       'linha em school_managers';
insert into t (name, passed, detail)
select 'B4b_papel_promovido',
       (select role from public.profiles where id = 'a0000001-0000-0000-0000-000000000001')::text = 'SCHOOL_MANAGER',
       'profiles.role';
insert into t (name, passed, detail)
select 'B4c_auditoria_gravada',
       exists (select 1 from public.audit_logs
               where action = 'APPROVE_SCHOOL_CLAIM' and entity_id = 'c0000001-0000-0000-0000-000000000001'),
       'audit_logs';
insert into t (name, passed, detail)
select 'B4d_status_aprovado',
       (select status::text from public.school_claims where id = 'c0000001-0000-0000-0000-000000000001') = 'APPROVED',
       'school_claims.status';

-- B5. Aprovar de novo a mesma reivindicação é recusado.
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000004-0000-0000-0000-000000000004','role','authenticated')::text, true);
  begin
    perform public.approve_school_claim('c0000001-0000-0000-0000-000000000001');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('B5_nao_reaprova', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- ============================================================
-- C. Publicação de lista pelo gestor
-- ============================================================

-- C1. Usuário SEM vínculo não publica em escola nenhuma.
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000003-0000-0000-0000-000000000003','role','authenticated')::text, true);
  begin
    perform public.school_manager_publish_list(
      '50000001-0000-0000-0000-000000000001', 'Ensino Fundamental', '1o ano', 2026,
      '[{"name":"Caderno","quantity":2}]'::jsonb);
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('C1_sem_vinculo_nao_publica', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- C2. Gestor da escola A NÃO publica na escola B.
do $$
declare v_caught text := null;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
  begin
    perform public.school_manager_publish_list(
      '50000002-0000-0000-0000-000000000002', 'Ensino Fundamental', '1o ano', 2026,
      '[{"name":"Caderno","quantity":2}]'::jsonb);
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  insert into t (name, passed, detail)
  values ('C2_gestor_a_nao_publica_em_b', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;

-- C3. Gestor publica na PRÓPRIA escola (controle positivo) e a auditoria
--     sai com a ação certa.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
select public.school_manager_publish_list(
  '50000001-0000-0000-0000-000000000001', 'Ensino Fundamental', '1o ano', 2026,
  '[{"name":"Caderno brochura","quantity":2},{"name":"Lapis de cor","quantity":1}]'::jsonb);
reset role;
select set_config('request.jwt.claims', '', true);

insert into t (name, passed, detail)
select 'C3a_lista_publicada',
       (select count(*) from public.school_lists where school_id = '50000001-0000-0000-0000-000000000001') = 1,
       'school_lists';
insert into t (name, passed, detail)
select 'C3b_itens_gravados',
       (select count(*) from public.school_list_items i
          join public.school_list_versions v on v.id = i.school_list_version_id
          join public.school_lists l on l.id = v.school_list_id
        where l.school_id = '50000001-0000-0000-0000-000000000001') = 2,
       'school_list_items';
insert into t (name, passed, detail)
select 'C3c_auditoria_com_acao_propria',
       exists (select 1 from public.audit_logs where action = 'SCHOOL_MANAGER_PUBLISH_LIST'),
       'audit_logs distingue gestor de admin';

-- C4. Republicar cria versão nova (RN-007), nunca sobrescreve.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
select public.school_manager_publish_list(
  '50000001-0000-0000-0000-000000000001', 'Ensino Fundamental', '1o ano', 2026,
  '[{"name":"Caderno brochura","quantity":3}]'::jsonb);
reset role;
select set_config('request.jwt.claims', '', true);
insert into t (name, passed, detail)
select 'C4_republicar_cria_versao_nova',
       (select count(*) from public.school_list_versions v
          join public.school_lists l on l.id = v.school_list_id
        where l.school_id = '50000001-0000-0000-0000-000000000001') = 2
       and (select count(*) from public.school_lists where school_id = '50000001-0000-0000-0000-000000000001') = 1,
       '2 versoes, 1 lista';

-- ============================================================
-- D. INEP é master data: o gestor não toca
-- ============================================================

-- D1. Gestor não altera nome/código INEP/endereço da própria escola.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
with attempt as (
  update public.schools
  set name = 'HACKED', inep_code = '00000000', address = 'HACKED'
  where id = '50000001-0000-0000-0000-000000000001'
  returning 1
)
insert into t (name, passed, detail)
select 'D1_gestor_nao_edita_campo_inep', not exists (select 1 from attempt), 'esperado 0 linhas atualizadas';
reset role;
select set_config('request.jwt.claims', '', true);

insert into t (name, passed, detail)
select 'D1b_escola_intacta',
       (select name from public.schools where id = '50000001-0000-0000-0000-000000000001') = 'Escola Onda7 A'
       and (select inep_code from public.schools where id = '50000001-0000-0000-0000-000000000001') = '90000001',
       'nome e inep_code originais';

-- D2. Gestor não desativa a própria escola (is_active também é do admin).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
with attempt as (
  update public.schools set is_active = false where id = '50000001-0000-0000-0000-000000000001' returning 1
)
insert into t (name, passed, detail)
select 'D2_gestor_nao_desativa_escola', not exists (select 1 from attempt), 'esperado 0 linhas atualizadas';
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- E. Campos editoriais: o que o gestor PODE e o que a trava impede
-- ============================================================

-- E1. Gestor edita descrição da própria escola (controle positivo).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
update public.school_profiles set description = 'Descricao escrita pela escola'
where school_id = '50000001-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claims', '', true);
insert into t (name, passed, detail)
select 'E1_gestor_edita_descricao',
       (select description from public.school_profiles where school_id = '50000001-0000-0000-0000-000000000001')
         = 'Descricao escrita pela escola',
       'controle positivo';

-- E2. Gestor NÃO se autoverifica. O trigger restaura em silêncio: o
--     UPDATE passa, o valor não muda.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
update public.school_profiles set is_verified = true, is_sponsored = true
where school_id = '50000001-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claims', '', true);
insert into t (name, passed, detail)
select 'E2_gestor_nao_se_autoverifica',
       (select is_verified from public.school_profiles where school_id = '50000001-0000-0000-0000-000000000001') = false
       and (select is_sponsored from public.school_profiles where school_id = '50000001-0000-0000-0000-000000000001') = false,
       'is_verified/is_sponsored restaurados pelo trigger';

-- E3. Gestor não edita o perfil editorial da escola B.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
with attempt as (
  update public.school_profiles set description = 'HACKED'
  where school_id = '50000002-0000-0000-0000-000000000002' returning 1
)
insert into t (name, passed, detail)
select 'E3_gestor_a_nao_edita_perfil_b', not exists (select 1 from attempt), 'esperado 0 linhas atualizadas';
reset role;
select set_config('request.jwt.claims', '', true);

-- E4. Admin CONTINUA podendo verificar (o trigger não pode ter quebrado
--     o caminho do admin).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000004-0000-0000-0000-000000000004','role','authenticated')::text, true);
update public.school_profiles set is_verified = true where school_id = '50000001-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claims', '', true);
insert into t (name, passed, detail)
select 'E4_admin_ainda_verifica',
       (select is_verified from public.school_profiles where school_id = '50000001-0000-0000-0000-000000000001') = true,
       'admin passa pelo trigger';

-- E5. Gestor adiciona, lê e remove um contato da própria escola.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
insert into public.school_contacts (id, school_id, contact_type, value, is_public)
values ('cc000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001', 'EMAIL', 'secretaria@escola.test', false);
insert into t (name, passed, detail)
select 'E5a_gestor_le_contato_nao_publico',
       exists (select 1 from public.school_contacts where id = 'cc000001-0000-0000-0000-000000000001'),
       'school_contacts_manager_select';
delete from public.school_contacts where id = 'cc000001-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claims', '', true);
insert into t (name, passed, detail)
select 'E5b_gestor_remove_contato',
       not exists (select 1 from public.school_contacts where id = 'cc000001-0000-0000-0000-000000000001'),
       'school_contacts_manager_delete';

-- E6. Gestor envia foto e não consegue fabricar approved_by.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
insert into public.school_images (id, school_id, storage_path, caption, is_approved, submitted_by, approved_by)
values ('11000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001',
        'schools/50000001-0000-0000-0000-000000000001/foto.jpg', 'Fachada', true,
        'a0000001-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000004');
reset role;
select set_config('request.jwt.claims', '', true);
insert into t (name, passed, detail)
select 'E6_approved_by_nao_fabricavel',
       (select approved_by from public.school_images where id = '11000001-0000-0000-0000-000000000001') is null,
       'trigger zera approved_by no INSERT do gestor';

-- E7. Admin esconde a foto; o gestor não a desesconde.
update public.school_images set is_approved = false where id = '11000001-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
update public.school_images set is_approved = true, caption = 'Fachada nova'
where id = '11000001-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claims', '', true);
insert into t (name, passed, detail)
select 'E7_gestor_nao_reverte_moderacao',
       (select is_approved from public.school_images where id = '11000001-0000-0000-0000-000000000001') = false
       and (select caption from public.school_images where id = '11000001-0000-0000-0000-000000000001') = 'Fachada nova',
       'is_approved travado, legenda editavel';

-- E8. Gestor não escreve direto em school_managers (não se auto-vincula
--     a outra escola).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a0000001-0000-0000-0000-000000000001','role','authenticated')::text, true);
do $$
declare v_caught text := null;
begin
  begin
    insert into public.school_managers (school_id, profile_id)
    values ('50000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001');
  exception when others then v_caught := sqlstate || ' ' || sqlerrm;
  end;
  insert into t (name, passed, detail)
  values ('E8_nao_se_autovincula', v_caught is not null, coalesce(v_caught, 'NAO BLOQUEOU'));
end $$;
reset role;
select set_config('request.jwt.claims', '', true);

-- ============================================================
-- Resultado
-- ============================================================

select seq, name, passed, detail from t order by seq;

rollback;
