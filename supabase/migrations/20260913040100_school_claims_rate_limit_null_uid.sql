-- Follow-up de 20260913040000_school_claim_and_publish.sql, aplicado
-- minutos depois na mesma sessão. A migration anterior NÃO é editada
-- (mesma disciplina de 20260911150100_moderation_guards_fix_public_grant
-- e 20260911160100_admin_crud_fix_anon_grant): o arquivo original fica
-- como foi aplicado, e a correção é esta.
--
-- O bug, descoberto na primeira execução de
-- supabase/tests/onda7_school_claim.sql:
--
--   ERROR: P0001: rate limit exceeded for school_claim_submit -- try again later
--   CONTEXT: PL/pgSQL function school_claims_before_insert() line 4 at RAISE
--
-- ...num INSERT feito pela conexão privilegiada, sem sessão nenhuma.
-- Causa: `check_rate_limit()`
-- (20260912000000_hardening_rn004_sec008_expand.sql) é **fail-closed**
-- quando `auth.uid()` é null -- ela retorna `false`, não `true`. Isso é
-- correto no desenho dela (o identificador do balde É o auth.uid(); sem
-- ele não há como contar, e negar é mais seguro que liberar), mas
-- transforma qualquer INSERT sem contexto de request -- seed, service
-- role, psql, migration de dados, fixture de teste -- num "limite
-- excedido" permanente e enganoso.
--
-- O escape hatch é o mesmo já usado nos dois triggers de proteção de
-- coluna desta onda e em `stores_protect_admin_columns` (Onda 6):
-- conexão sem sessão não é um usuário abusando de um formulário -- e
-- essas conexões já ignoram RLS de qualquer forma, então o limite ali
-- nunca foi uma defesa real. O caminho que importa (PostgREST como
-- `authenticated`) continua limitado exatamente como antes.

create or replace function public.school_claims_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Sem sessão (service role, psql, migrations, seed): não é o caminho
  -- que este limite existe para conter, e `check_rate_limit` negaria
  -- 100% desses INSERTs por ser fail-closed.
  if (select auth.uid()) is null then
    return new;
  end if;

  if not public.check_rate_limit('school_claim_submit', 5, 60) then
    raise exception 'rate limit exceeded for school_claim_submit -- try again later';
  end if;
  perform public.record_rate_limit_hit('school_claim_submit');
  return new;
end;
$$;

comment on function public.school_claims_before_insert() is
  'Onda 7: rate limit (5/hora por auth.uid()) no INSERT de school_claims, no banco e não só na Server Action -- a policy de INSERT é aberta para authenticated e o PostgREST fala com a tabela direto. Conexões sem sessão passam: check_rate_limit é fail-closed com auth.uid() nulo e negaria seed/service role/migrations.';
