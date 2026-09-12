-- Regressão: "admin não aprova a própria lista" (Prompt 20 gap-analysis
-- flagged isso como comportamento correto mas SEM teste automatizado --
-- este arquivo é essa lacuna fechada). Cobre as 3 funções de decisão de
-- moderação que compartilham a mesma guarda de autoavaliação
-- (moderation_guards.sql): approve_submission, reject_submission,
-- request_submission_correction.
--
-- Roda inteiro dentro de uma transação com ROLLBACK -- nenhum dado de
-- teste é commitado. Mesmo padrão de supabase/tests/rls_idor.sql:
-- simula identidade via `set local role authenticated` +
-- `set_config('request.jwt.claims', ...)`.
--
--   via Supabase MCP: execute_sql com o conteúdo deste arquivo
--   via psql: psql "$DATABASE_URL" -f supabase/tests/admin-self-approval-regression.sql

begin;

-- ============================================================
-- Fixtures
-- ============================================================

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'admin-a-selfapproval-test@test.local', '{}'),
  ('b0000000-0000-0000-0000-00000000000b', 'user-b-selfapproval-test@test.local', '{}');

update public.profiles set role = 'ADMIN' where id = 'a0000000-0000-0000-0000-00000000000a';

insert into public.schools (id, inep_code, name, slug, uf, municipality, school_type, is_active) values
  ('c0000000-0000-0000-0000-00000000000c', '99999901', 'Escola Selfapproval Test', 'escola-selfapproval-test', 'MT', 'Cuiaba', 'PUBLIC', true);

-- Três submissões de Admin A (uma por RPC testada) e uma de User B (para
-- provar que a mesma RPC funciona normalmente quando o autor não é quem
-- decide).
insert into public.list_submissions (id, school_id, submitted_by, education_level, series_name, school_year, status) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'FUNDAMENTAL_1', 'Selfapproval 1o ano', 2026, 'SUBMITTED'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'FUNDAMENTAL_1', 'Selfapproval 2o ano', 2026, 'SUBMITTED'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'FUNDAMENTAL_1', 'Selfapproval 3o ano', 2026, 'SUBMITTED'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-00000000000b', 'FUNDAMENTAL_1', 'Selfapproval 4o ano (User B)', 2026, 'SUBMITTED');

insert into public.submission_items (submission_id, name, quantity) values
  ('d0000000-0000-0000-0000-000000000001', 'Caderno', 1),
  ('d0000000-0000-0000-0000-000000000004', 'Caderno', 1);

create temp table test_results (
  seq int generated always as identity,
  test_name text primary key,
  passed boolean,
  detail text
) on commit drop;
grant select, insert on test_results to authenticated, anon;

-- ============================================================
-- Introspecção: a assinatura da RPC não aceita nenhum "user_id"/"actor"
-- vindo do chamador -- fecha por design a possibilidade citada na tarefa
-- ("tentativa de contornar enviando outro user_id no body"). Quem decide
-- quem é o chamador é sempre auth.uid() (derivado do JWT verificado pelo
-- PostgREST), nunca um parâmetro da função.
-- ============================================================

insert into test_results (test_name, passed, detail)
select
  'approve_submission: assinatura não aceita user_id/actor do chamador',
  count(*) = 1 and bool_and(pg_get_function_identity_arguments(p.oid) = 'p_submission_id uuid'),
  string_agg(pg_get_function_identity_arguments(p.oid), ',')
from pg_proc p
where p.proname = 'approve_submission' and p.pronamespace = 'public'::regnamespace;

-- ============================================================
-- Teste 1: Admin A tenta aprovar a PRÓPRIA submissão -> NEGADO
-- ============================================================

do $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);

  begin
    perform public.approve_submission('d0000000-0000-0000-0000-000000000001');
    insert into test_results (test_name, passed, detail) values (
      'approve_submission: admin não pode aprovar a própria submissão',
      false,
      'nenhuma exceção foi lançada -- a submissão foi aprovada indevidamente'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      'approve_submission: admin não pode aprovar a própria submissão',
      sqlerrm like '%cannot review your own submission%',
      'sqlerrm=' || sqlerrm
    );
  end;

  perform set_config('request.jwt.claims', '', true);
end $$;

-- Confirma que o status realmente não mudou (defesa em profundidade --
-- não confiar só na mensagem de erro).
insert into test_results (test_name, passed, detail)
select
  'approve_submission: status da submissão continua SUBMITTED após tentativa negada',
  status = 'SUBMITTED',
  'status=' || status
from public.list_submissions where id = 'd0000000-0000-0000-0000-000000000001';

-- ============================================================
-- Teste 2: Admin A aprova a submissão de User B -> PERMITIDO
-- ============================================================

do $$
declare
  v_version_id uuid;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);

  begin
    v_version_id := public.approve_submission('d0000000-0000-0000-0000-000000000004');
    insert into test_results (test_name, passed, detail) values (
      'approve_submission: admin aprova submissão de outro usuário normalmente',
      v_version_id is not null,
      'version_id=' || coalesce(v_version_id::text, 'null')
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      'approve_submission: admin aprova submissão de outro usuário normalmente',
      false,
      'exceção inesperada: ' || sqlerrm
    );
  end;

  perform set_config('request.jwt.claims', '', true);
end $$;

insert into test_results (test_name, passed, detail)
select
  'approve_submission: status da submissão de User B virou APPROVED',
  status = 'APPROVED',
  'status=' || status
from public.list_submissions where id = 'd0000000-0000-0000-0000-000000000004';

-- ============================================================
-- Teste 3: mesma guarda em reject_submission (autoavaliação negada)
-- ============================================================

do $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);

  begin
    perform public.reject_submission('d0000000-0000-0000-0000-000000000002', 'motivo de teste');
    insert into test_results (test_name, passed, detail) values (
      'reject_submission: admin não pode rejeitar a própria submissão',
      false,
      'nenhuma exceção foi lançada'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      'reject_submission: admin não pode rejeitar a própria submissão',
      sqlerrm like '%cannot review your own submission%',
      'sqlerrm=' || sqlerrm
    );
  end;

  perform set_config('request.jwt.claims', '', true);
end $$;

-- ============================================================
-- Teste 4: mesma guarda em request_submission_correction (autoavaliação negada)
-- ============================================================

do $$
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);

  begin
    perform public.request_submission_correction('d0000000-0000-0000-0000-000000000003', 'observação de teste');
    insert into test_results (test_name, passed, detail) values (
      'request_submission_correction: admin não pode pedir correção na própria submissão',
      false,
      'nenhuma exceção foi lançada'
    );
  exception when others then
    insert into test_results (test_name, passed, detail) values (
      'request_submission_correction: admin não pode pedir correção na própria submissão',
      sqlerrm like '%cannot review your own submission%',
      'sqlerrm=' || sqlerrm
    );
  end;

  perform set_config('request.jwt.claims', '', true);
end $$;

-- ============================================================
-- Resultado
-- ============================================================

select test_name, passed, detail from test_results order by seq;

select
  count(*) as total,
  count(*) filter (where passed) as passed,
  count(*) filter (where not passed) as failed
from test_results;

rollback;
