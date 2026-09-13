-- Terceiro (e último) follow-up de
-- 20260913040000_school_claim_and_publish.sql. Completa o que
-- 20260913040200 começou.
--
-- Depois de revogar de PUBLIC, as três funções de trigger da Onda 7 ainda
-- apareciam com EXECUTE para `authenticated` -- não por grant explícito
-- desta migration, mas pelo `ALTER DEFAULT PRIVILEGES` que o Supabase
-- mantém no schema `public`. Medido ao vivo, comparando com as funções de
-- trigger que já existiam:
--
--   proname                                  anon   authenticated
--   guard_submission_status_transition       f      f
--   handle_new_user                          f      f
--   stores_protect_admin_columns   (Onda 6)  f      f
--   store_claims_before_insert     (Onda 6)  f      f
--   school_*                       (Onda 7)  f      **t**   <- fora do padrão
--
-- Ou seja: o schema já tinha uma convenção -- função de trigger não tem
-- EXECUTE para nenhum papel de cliente -- e as três da Onda 7 eram as
-- únicas fora dela. A Onda 6 precisou de duas migrations para chegar lá
-- (`store_self_service_revoke_trigger_grants` e depois
-- `..._authenticated`); esta é a segunda metade equivalente.
--
-- Verificado ao vivo antes de aplicar (transação com ROLLBACK), como
-- `authenticated` e sem nenhum EXECUTE nas três funções: UPDATE de perfil
-- editorial passa, `is_verified` continua sendo restaurado para false,
-- INSERT em `school_claims` passa pelo trigger de rate limit, e
-- `approved_by` forjado continua sendo zerado. O privilégio de EXECUTE de
-- uma função de trigger é checado no `CREATE TRIGGER`, não a cada
-- disparo.

revoke execute on function public.school_claims_before_insert() from authenticated;
revoke execute on function public.school_profiles_protect_admin_columns() from authenticated;
revoke execute on function public.school_images_protect_admin_columns() from authenticated;
