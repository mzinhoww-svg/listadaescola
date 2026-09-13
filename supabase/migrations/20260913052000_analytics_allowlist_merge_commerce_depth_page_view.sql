-- Correção de colisão entre sessões paralelas na mesma função.
--
-- Esta sessão aplicou 20260913051500_page_view_event.sql (adiciona
-- `page_view`) ao banco compartilhado DEPOIS de uma sessão paralela ter
-- aplicado commerce_depth.sql (adiciona `commerce_coverage_impression` e
-- `whatsapp_compare_started`, Onda 8) -- confirmado pela ordem real em
-- `list_migrations` (20260913034757 commerce_depth < 20260913042407
-- page_view_event, versões atribuídas pelo próprio Supabase no momento de
-- cada `apply_migration`, não os timestamps dos arquivos locais). Um
-- `create or replace function` escrito sem reler a versão viva mais
-- recente sobrescreveu a lista da outra sessão em vez de estendê-la --
-- confirmado via `pg_get_functiondef` antes desta migration: os dois
-- valores da Onda 8 não estavam mais na allowlist viva, silenciosamente
-- (o `try/catch` de `recordAnalyticsEvent` engole o erro, então nenhuma
-- página quebrou -- só o evento parou de ser gravado).
--
-- Reconciliação: união dos dois conjuntos, ninguém perde nada.
-- Assinatura, corpo, SECURITY DEFINER, search_path e grants permanecem
-- idênticos ao original (20260911020000_search_schools.sql).
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
    'school_view', 'list_view', 'list_share', 'commerce_click',
    'commerce_coverage_impression', 'whatsapp_click', 'whatsapp_compare_started',
    'store_view', 'favorite_added', 'review_created', 'submission_started',
    'submission_submitted', 'submission_approved', 'home_list_request_click',
    'page_view'
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
  'Only validated write path into analytics_events for anon/authenticated (RF-015) -- the table itself has no insert policy for them. event_type is checked against the PRD-defined event list (section 15, "eventos minimos") plus the additive ones: home_list_request_click (home CTA), commerce_coverage_impression and whatsapp_compare_started (Onda 8, comercio com profundidade), and page_view (Tier 4 - D4, dashboard de visitas). Anything else raises instead of silently accepting arbitrary event names.';

revoke all on function public.record_analytics_event(text, uuid, uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.record_analytics_event(text, uuid, uuid, uuid, uuid, text, jsonb) to anon, authenticated;
