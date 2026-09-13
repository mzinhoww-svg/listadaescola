-- Roadmap Tier 4 - D4 (docs/product/roadmap-icps-2026-09.md): dashboard
-- não mostrava "visitas" porque não existia tipo de evento de pageview no
-- catálogo -- school_view/list_view/school_search já cobrem suas próprias
-- telas, mas 14 páginas públicas (home, listagens de UF/cidade, todas as
-- institucionais) não disparavam nenhum evento. Mesma assinatura de
-- record_analytics_event -- create or replace basta, sem drop.
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
