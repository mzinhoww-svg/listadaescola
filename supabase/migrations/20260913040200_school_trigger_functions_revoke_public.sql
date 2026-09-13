-- Segundo follow-up de 20260913040000_school_claim_and_publish.sql
-- (o primeiro é 20260913040100). A migration original fica intocada; a
-- correção é esta -- mesma disciplina de 20260911150100 e 20260911160100.
--
-- Achado: as três funções de trigger criadas pela Onda 7 nasceram com
-- EXECUTE para PUBLIC (o default de toda função no Postgres), e duas
-- delas são SECURITY DEFINER. Confirmado ao vivo:
--
--   proname                                 secdef  anon  auth  public
--   school_claims_before_insert             f       t     t     t
--   school_images_protect_admin_columns     t       t     t     t
--   school_profiles_protect_admin_columns   t       t     t     t
--
-- É a mesma armadilha que este projeto já pagou duas vezes (o grant real
-- é a EXECUTE implícita para PUBLIC na criação, e `revoke ... from anon`
-- é no-op) -- só que aqui ninguém tinha revogado nada, porque funções de
-- trigger não costumam entrar na checklist de grants. Elas continuam
-- listadas pelo advisor `anon_security_definer_function_executable` do
-- mesmo jeito que qualquer RPC.
--
-- Ninguém precisa desse EXECUTE. Uma função que retorna `trigger` sequer
-- é exposta pelo PostgREST, mas "não é exposta hoje" não é o mesmo que
-- "não é executável" -- e o padrão do resto do schema é conceder só a
-- quem precisa.
--
-- Verificado ao vivo antes de aplicar (transação com ROLLBACK): depois do
-- revoke, um UPDATE de gestor em `school_profiles` continua passando E o
-- trigger continua restaurando `is_verified` para false. É o
-- comportamento documentado do Postgres -- o privilégio de EXECUTE de uma
-- função de trigger é checado no CREATE TRIGGER, não a cada disparo.

revoke execute on function public.school_claims_before_insert() from public;
revoke execute on function public.school_profiles_protect_admin_columns() from public;
revoke execute on function public.school_images_protect_admin_columns() from public;
