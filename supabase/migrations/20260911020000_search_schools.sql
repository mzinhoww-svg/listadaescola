-- Resultados (Prompt 06): search_schools() extends the proximity/fallback
-- logic of nearby_schools() (Prompt 05, left untouched -- it's already
-- used elsewhere for the simpler "nearest school" lookup) with the
-- filters/sort/pagination the results page needs: tipo, etapa,
-- avaliação; relevância, proximidade, popularidade, avaliação (PRD
-- RF-002/RF-003).
--
-- Ranking notes (RF-003, RN-008): `relevance_score` is computed only
-- from organic signals (proximity, list availability, verification,
-- review count) -- sponsorship NEVER feeds into it, so a sponsored
-- school's displayed rating/relevance is always its real, unmodified
-- organic number ("pagamento não altera a nota orgânica da escola").
-- `is_sponsored`/`sponsor_priority` are separate columns the caller uses
-- to place sponsored results in their own explicitly-labeled slot
-- ("PATROCINADA") and, per RF-003's "posição... explicitamente
-- sinalizado", to sort them first -- never blended into or disguised as
-- relevância/avaliação. This is a reasonable initial algorithm, not a
-- final one: RF-003 explicitly calls for admin-configurable weights,
-- which is Prompt 13's job.

create or replace function public.search_schools(
  p_uf text default 'MT',
  p_lat numeric default null,
  p_lon numeric default null,
  p_municipality text default null,
  p_cep text default null,
  p_name_query text default null,
  p_radius_km numeric default null,
  p_school_type public.school_type default null,
  p_education_level text default null,
  p_min_rating numeric default null,
  p_sort text default 'relevance',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  inep_code text,
  name text,
  slug text,
  uf text,
  municipality text,
  location_type public.location_type,
  school_type public.school_type,
  address text,
  latitude double precision,
  longitude double precision,
  distance_km numeric,
  avg_rating numeric,
  review_count int,
  list_count int,
  favorite_count int,
  is_verified boolean,
  is_sponsored boolean,
  relevance_score numeric,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $function$
declare
  v_point geography;
begin
  if p_lat is not null and p_lon is not null then
    v_point := ST_SetSRID(ST_MakePoint(p_lon::float8, p_lat::float8), 4326)::geography;
  end if;

  return query
    with base as (
      select
        s.id, s.inep_code, s.name, s.slug, s.uf, s.municipality,
        s.location_type, s.school_type, s.address, s.latitude, s.longitude,
        case
          when v_point is not null and s.location is not null
            then round((ST_Distance(s.location, v_point) / 1000)::numeric, 2)
          else null
        end as distance_km
      from public.schools s
      where s.is_active
        and s.uf = p_uf
        and (p_school_type is null or s.school_type = p_school_type)
        and (
          p_education_level is null
          or exists (
            select 1 from public.school_education_levels el
            where el.school_id = s.id and el.education_level = p_education_level
          )
        )
        and (
          p_name_query is null or btrim(p_name_query) = ''
          or s.name ilike '%' || btrim(p_name_query) || '%'
        )
        and (
          -- location narrowing only applies when no free-text name query is
          -- driving the search -- "busca por escola" (RF-002) shouldn't be
          -- limited to one município/CEP the user never actually typed.
          p_name_query is not null and btrim(p_name_query) <> ''
          or (
            (v_point is null or p_radius_km is null or s.location is null or ST_DWithin(s.location, v_point, p_radius_km * 1000))
            and (p_municipality is null or btrim(p_municipality) = '' or s.municipality ilike btrim(p_municipality))
            and (
              p_cep is null or btrim(p_cep) = ''
              or (s.cep is not null and left(regexp_replace(s.cep, '\D', '', 'g'), 5) = left(regexp_replace(p_cep, '\D', '', 'g'), 5))
            )
          )
        )
    ),
    ratings as (
      select school_id, avg(rating)::numeric(3, 2) as avg_rating, count(*)::int as review_count
      from public.reviews
      where status = 'APPROVED'
      group by school_id
    ),
    lists as (
      select school_id, count(*)::int as list_count
      from public.school_lists
      where status = 'APPROVED'
      group by school_id
    ),
    favs as (
      select target_id as school_id, count(*)::int as favorite_count
      from public.favorites
      where target_type = 'SCHOOL'
      group by target_id
    ),
    sponsorship as (
      select entity_id as school_id, max(priority) as sponsor_priority
      from public.campaigns
      where entity_type = 'SCHOOL' and status = 'ACTIVE' and now() between starts_at and ends_at
      group by entity_id
    ),
    combined as (
      select
        b.*,
        coalesce(r.avg_rating, 0) as avg_rating,
        coalesce(r.review_count, 0) as review_count,
        coalesce(l.list_count, 0) as list_count,
        coalesce(f.favorite_count, 0) as favorite_count,
        coalesce(sp2.is_verified, false) as is_verified,
        (sp.school_id is not null) as is_sponsored,
        coalesce(sp.sponsor_priority, 0) as sponsor_priority
      from base b
      left join ratings r on r.school_id = b.id
      left join lists l on l.school_id = b.id
      left join favs f on f.school_id = b.id
      left join sponsorship sp on sp.school_id = b.id
      left join public.school_profiles sp2 on sp2.school_id = b.id
    ),
    scored as (
      -- Every column referenced here must be qualified with `combined.`:
      -- search_schools()'s RETURNS TABLE implicitly declares same-named
      -- PL/pgSQL variables (distance_km, list_count, is_verified,
      -- review_count, avg_rating, ...), so a bare reference is ambiguous
      -- between "that variable" and "this CTE's column" -- not just a
      -- style choice, an unqualified reference here fails to compile.
      select
        combined.*,
        (
          coalesce(case when combined.distance_km is not null then 1.0 / (1 + combined.distance_km) else 0.5 end, 0.5) * 0.5
          + (least(combined.list_count, 5)::numeric / 5) * 0.3
          + (case when combined.is_verified then 1 else 0 end) * 0.1
          + (least(combined.review_count, 10)::numeric / 10) * 0.1
        )::numeric(4, 3) as relevance_score
      from combined
      where p_min_rating is null or combined.avg_rating >= p_min_rating
    )
    select
      s.id, s.inep_code, s.name, s.slug, s.uf, s.municipality,
      s.location_type, s.school_type, s.address, s.latitude, s.longitude,
      s.distance_km, s.avg_rating, s.review_count, s.list_count, s.favorite_count,
      s.is_verified, s.is_sponsored, s.relevance_score,
      count(*) over ()::bigint as total_count
    from scored s
    order by
      s.is_sponsored desc,
      s.sponsor_priority desc,
      case when p_sort = 'proximity' then s.distance_km end asc nulls last,
      case when p_sort = 'rating' then s.avg_rating end desc nulls last,
      case when p_sort = 'popularity' then (s.review_count + s.list_count + s.favorite_count) end desc nulls last,
      case when p_sort = 'relevance' or p_sort is null then s.relevance_score end desc nulls last,
      s.name asc
    limit p_limit offset p_offset;
end;
$function$;

comment on function public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int) is
  'Resultados: filtros (tipo, etapa, avaliação mínima, nome), ordenação (relevance/proximity/popularity/rating), paginação. relevance_score é só sinal orgânico (proximidade + listas + verificação + avaliações) -- patrocínio nunca entra nele, só desempata a ordem/posição, sempre sinalizado separadamente (PRD RF-003, RN-008). SECURITY INVOKER, relies on schools_select_active RLS.';

-- Analytics (RF-015): analytics_events has zero anon/authenticated
-- policies by design (docs/security/rls.md) -- this SECURITY DEFINER
-- function is the one narrow, validated write path, never the raw
-- table. Never readable by anon/authenticated (only admin can SELECT,
-- unchanged from Prompt 02).
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
    'submission_submitted', 'submission_approved'
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
  'Only validated write path into analytics_events for anon/authenticated (RF-015) -- the table itself has no insert policy for them. event_type is checked against the PRD-defined event list (section 15); anything else raises instead of silently accepting arbitrary event names.';

revoke all on function public.record_analytics_event(text, uuid, uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.record_analytics_event(text, uuid, uuid, uuid, uuid, text, jsonb) to anon, authenticated;
