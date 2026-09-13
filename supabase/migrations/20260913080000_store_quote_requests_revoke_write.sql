-- Endurecimento de tabela nova, antes de ela ir para produção com uso real.
--
-- `store_quote_requests` foi desenhada para receber linha por UM caminho
-- só: a RPC `record_store_quote_request`, que é SECURITY DEFINER e roda
-- com os privilégios do dono. O cliente nunca insere direto.
--
-- A RLS já garantia isso -- não existe policy de INSERT, e o agente da
-- Onda 6 provou por requisição real: anon -> 401 42501, autenticado ->
-- 403 42501. Mas o GRANT de INSERT/UPDATE/DELETE para `authenticated`
-- continuava concedido, redundante. Redundante hoje; buraco no dia em que
-- alguém acrescentar uma policy permissiva de INSERT sem lembrar que o
-- grant estava aberto. O grant passa a dizer a mesma coisa que o desenho.
--
-- SELECT continua, com os grants por coluna que a Onda 6 definiu: o
-- gestor lê id/store_id/school_id/school_list_id/created_at e NÃO lê
-- `dedupe_hash`.
--
-- Revogar não afeta a RPC: SECURITY DEFINER não usa os privilégios de
-- quem chama.

revoke insert, update, delete on public.store_quote_requests from authenticated;
revoke insert, update, delete on public.store_quote_requests from anon;
