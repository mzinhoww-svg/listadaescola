-- Onda 8 (comércio com profundidade): dois tipos de evento novos no
-- allowlist de record_analytics_event(). Nada além disso -- nenhuma
-- tabela, coluna, política ou função de negócio muda aqui, e nada nesta
-- onda cria estado de pedido/pagamento (continua proibido: e-commerce
-- termina em link externo + tracking, papelaria termina em WhatsApp).
--
-- `commerce_coverage_impression`: um evento por parceiro exibido no bloco
-- de cobertura agregada da lista ("esta loja cobre 12 dos 18 itens").
-- Mesmo papel de `school_impression` na busca: é o denominador que
-- faltava para transformar `commerce_click` em CTR por parceiro -- o
-- "relatório que fecha o laço com o parceiro" que a Onda 8 pede.
--
-- `whatsapp_compare_started`: o usuário decidiu pedir o MESMO orçamento a
-- N papelarias. Cada conversa aberta continua gerando seu próprio
-- `whatsapp_click` em /api/store/whatsapp; este evento só marca a
-- intenção de comparar e contra quantas lojas.
--
-- A PRD (seção 15) chama sua lista de "eventos mínimos", então acrescentar
-- é aditivo, não contraditório.
--
-- Esta função é recriada, não alterada: a lista abaixo parte da definição
-- que está VIVA no banco hoje (verificada via pg_get_functiondef), o que
-- inclui `home_list_request_click`, adicionado por outra sessão em
-- 20260913032102. Se aquela migration for aplicada depois desta num
-- rebuild do zero, ela roda antes (timestamp menor) e esta fica por cima
-- com a lista completa -- em nenhuma ordem um dos dois eventos se perde.
-- Assinatura, corpo do insert, SECURITY DEFINER, search_path e grants
-- permanecem idênticos ao original (20260911020000_search_schools.sql).

create or replace function public.record_analytics_event(
  p_event_type text,
  p_school_id uuid default null,
  p_store_id uuid default null,
  p_list_id uuid default null,
  p_partner_id uuid default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if p_event_type not in (
    'location_search', 'location_detected', 'school_search', 'school_impression',
    'school_view', 'list_view', 'list_share', 'commerce_click', 'whatsapp_click',
    'store_view', 'favorite_added', 'review_created', 'submission_started',
    'submission_submitted', 'submission_approved', 'home_list_request_click',
    'commerce_coverage_impression', 'whatsapp_compare_started'
  ) then
    raise exception 'invalid event_type: %', p_event_type;
  end if;

  insert into public.analytics_events (
    event_type, profile_id, school_id, store_id, list_id, partner_id, session_id, metadata
  )
  values (
    p_event_type, auth.uid(), p_school_id, p_store_id, p_list_id, p_partner_id,
    p_session_id, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$function$;

comment on function public.record_analytics_event(text, uuid, uuid, uuid, uuid, text, jsonb) is
  'Only validated write path into analytics_events for anon/authenticated (RF-015) -- the table itself has no insert policy for them. event_type is checked against the PRD-defined event list (section 15, "eventos minimos") plus the additive ones: home_list_request_click (home), commerce_coverage_impression and whatsapp_compare_started (Onda 8). Anything else raises instead of silently accepting arbitrary event names.';

revoke all on function public.record_analytics_event(text, uuid, uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.record_analytics_event(text, uuid, uuid, uuid, uuid, text, jsonb) to anon, authenticated;
