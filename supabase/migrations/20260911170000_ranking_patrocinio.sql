-- Prompt 13 (ranking + patrocínio): admin-configurable organic ranking
-- weights, campaign (patrocínio) admin CRUD, and a real fix for a gap
-- the Prompt 06 tests never actually exercised (campaigns was empty
-- then, so nothing could reveal it).
--
-- RF-003 names three dimensions that must stay separate: "Relevância
-- orgânica" (distância + popularidade + completude + disponibilidade de
-- listas -- PRD's own list), "Avaliação" (nota das avaliações
-- moderadas), "Patrocínio" (posição/destaque, nunca disfarçado de
-- avaliação). This prompt's own instruction text names the same three
-- dimensions with literal identifiers -- organic_score, rating_score,
-- sponsored_priority -- and adds "qualidade" to the organic list; both
-- are additive, not contradictory, so search_schools() now exposes all
-- three as real, separate columns (never blended into each other).

-- Singleton config row for the organic weights -- "pesos configuráveis
-- no backend/admin, não em React" (prompt text, verbatim). `id boolean
-- primary key default true` + `check (id)` is the standard Postgres
-- "exactly one row, ever" trick: id can only be literal `true`, so the
-- primary key uniqueness constraint alone makes a second row impossible.
-- No RLS policy grants anon/authenticated anything here -- the weights
-- are consumed exclusively inside search_schools() (SECURITY DEFINER,
-- bypasses RLS as its owner), never fetched by the client.
create table public.ranking_weights (
  id boolean primary key default true,
  constraint ranking_weights_singleton check (id),
  weight_distance numeric(3, 2) not null default 0.35,
  weight_popularity numeric(3, 2) not null default 0.25,
  weight_lists numeric(3, 2) not null default 0.20,
  weight_completeness numeric(3, 2) not null default 0.10,
  weight_quality numeric(3, 2) not null default 0.10,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

insert into public.ranking_weights (id) values (true);

alter table public.ranking_weights enable row level security;

create policy "ranking_weights_admin_all" on public.ranking_weights
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin mutation: validated (weights >= 0, sum within a cent of 1.0 so
-- the composite organic_score stays a meaningful ~0-1 range), audit-logged.
create or replace function public.admin_update_ranking_weights(
  p_weight_distance numeric,
  p_weight_popularity numeric,
  p_weight_lists numeric,
  p_weight_completeness numeric,
  p_weight_quality numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.ranking_weights;
  v_sum numeric;
begin
  if not public.is_admin() then
    raise exception 'only admins may update ranking weights';
  end if;

  if p_weight_distance < 0 or p_weight_popularity < 0 or p_weight_lists < 0
    or p_weight_completeness < 0 or p_weight_quality < 0 then
    raise exception 'weights cannot be negative';
  end if;

  v_sum := p_weight_distance + p_weight_popularity + p_weight_lists + p_weight_completeness + p_weight_quality;
  if abs(v_sum - 1) > 0.01 then
    raise exception 'weights must sum to 1.0 (got %)', v_sum;
  end if;

  select * into v_before from public.ranking_weights where id = true for update;

  update public.ranking_weights set
    weight_distance = p_weight_distance,
    weight_popularity = p_weight_popularity,
    weight_lists = p_weight_lists,
    weight_completeness = p_weight_completeness,
    weight_quality = p_weight_quality,
    updated_at = now(),
    updated_by = auth.uid()
  where id = true;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'ADMIN_UPDATE_RANKING_WEIGHTS', 'ranking_weights', null, to_jsonb(v_before),
    jsonb_build_object(
      'weight_distance', p_weight_distance, 'weight_popularity', p_weight_popularity, 'weight_lists', p_weight_lists,
      'weight_completeness', p_weight_completeness, 'weight_quality', p_weight_quality
    )
  );
end;
$$;

-- Admin mutation: create a campaign. Entity is resolved by name search
-- (schools/stores) rather than a raw ID input -- campaigns.entity_id has
-- no FK (it's polymorphic across two tables, can't be FK-constrained),
-- so resolving by name here keeps the admin from ever pasting an
-- arbitrary/wrong uuid by hand.
create or replace function public.admin_create_campaign(
  p_entity_type text,
  p_entity_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_priority int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type public.campaign_entity_type := p_entity_type::public.campaign_entity_type;
  v_entity_id uuid;
  v_match_count int;
  v_campaign_id uuid;
begin
  if not public.is_admin() then
    raise exception 'only admins may create campaigns';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'end date must be after start date';
  end if;
  if p_priority < 0 then
    raise exception 'priority cannot be negative';
  end if;

  if v_entity_type = 'SCHOOL' then
    select count(*), max(id) into v_match_count, v_entity_id from public.schools where name ilike btrim(p_entity_name);
  else
    select count(*), max(id) into v_match_count, v_entity_id from public.stores where name ilike btrim(p_entity_name);
  end if;

  if v_match_count = 0 then
    raise exception 'no % found matching "%"', lower(v_entity_type::text), p_entity_name;
  elsif v_match_count > 1 then
    raise exception '% matches for "%" -- use the exact name', v_match_count, p_entity_name;
  end if;

  insert into public.campaigns (entity_type, entity_id, starts_at, ends_at, priority, status, created_by)
  values (v_entity_type, v_entity_id, p_starts_at, p_ends_at, p_priority, 'SCHEDULED', auth.uid())
  returning id into v_campaign_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'ADMIN_CREATE_CAMPAIGN', 'campaigns', v_campaign_id, null,
    jsonb_build_object('entity_type', v_entity_type, 'entity_id', v_entity_id, 'priority', p_priority)
  );

  return v_campaign_id;
end;
$$;

-- Admin mutation: status only (SCHEDULED/ACTIVE/PAUSED/ENDED) --
-- campaigns don't get their dates/priority edited in place once
-- created, same "close old, open new" spirit as school_lists staying
-- append-only (Prompt 12); a mistake gets paused, not silently rewritten.
create or replace function public.admin_set_campaign_status(p_campaign_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.campaigns;
  v_status public.campaign_status := p_status::public.campaign_status;
begin
  if not public.is_admin() then
    raise exception 'only admins may change campaign status';
  end if;

  select * into v_before from public.campaigns where id = p_campaign_id for update;
  if v_before is null then
    raise exception 'campaign % not found', p_campaign_id;
  end if;

  update public.campaigns set status = v_status where id = p_campaign_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'ADMIN_SET_CAMPAIGN_STATUS', 'campaigns', p_campaign_id, to_jsonb(v_before), jsonb_build_object('status', v_status));
end;
$$;

revoke execute on function public.admin_update_ranking_weights(numeric, numeric, numeric, numeric, numeric) from public, anon;
revoke execute on function public.admin_create_campaign(text, text, timestamptz, timestamptz, int) from public, anon;
revoke execute on function public.admin_set_campaign_status(uuid, text) from public, anon;
grant execute on function public.admin_update_ranking_weights(numeric, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.admin_create_campaign(text, text, timestamptz, timestamptz, int) to authenticated;
grant execute on function public.admin_set_campaign_status(uuid, text) to authenticated;

-- search_schools(): rewritten (drop + recreate -- CREATE OR REPLACE
-- cannot change a function's RETURNS TABLE shape) for three things:
--
-- 1. organic_score (renamed from relevance_score) now reads its five
--    weights from ranking_weights instead of hardcoded constants, and
--    gains two factors it didn't have before -- "popularidade" (now a
--    real combination of review_count + favorite_count; favorite_count
--    was already computed in this query but never actually used in
--    scoring) and "completude" (fraction of school_profiles fields
--    filled in). "Listas aprovadas" and "qualidade" (is_verified) are
--    kept as their own factors, same as the old formula's list_count/
--    is_verified terms, just reweighted from the config table.
-- 2. rating_score: avg_rating normalized to the same ~0-1 range as
--    organic_score (avg_rating / 5, 0 with no reviews). A new, separate
--    column -- avg_rating itself is untouched (still the raw 1-5 value
--    SchoolCard displays) and organic_score never includes rating at
--    all, matching the PRD's own split ("Relevância orgânica" and
--    "Avaliação" are two different bullets in RF-003, not one).
-- 3. SECURITY DEFINER (was INVOKER): campaigns has only an admin RLS
--    policy (campaigns_admin_all, see rls_campaigns_analytics_audit.sql)
--    -- as SECURITY INVOKER, a real anon/authenticated caller's
--    `sponsorship` CTE would be silently filtered to nothing by RLS, so
--    is_sponsored/sponsored_priority would always read false/0 for every
--    non-admin visitor once real campaign data exists. The Prompt 06
--    test that claimed "anon gets the same result as a privileged
--    connection" only held because campaigns had 0 rows at the time --
--    it could not have caught this. Switching to DEFINER fixes it
--    without ever exposing the raw campaigns table (only the derived
--    is_sponsored boolean / sponsored_priority int leave this function);
--    every other table this function touches already has a public-read
--    policy matching this function's own explicit WHERE filters
--    (is_active, APPROVED, PENDING->APPROVED for reviews), so DEFINER
--    changes nothing else visible.
drop function if exists public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int);

create function public.search_schools(
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
  rating_score numeric,
  review_count int,
  list_count int,
  favorite_count int,
  is_verified boolean,
  is_sponsored boolean,
  sponsored_priority int,
  organic_score numeric,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_point geography;
  w public.ranking_weights;
begin
  select * into w from public.ranking_weights where id = true;
  if w is null then
    -- Defensive only: the singleton row is seeded at migration time and
    -- nothing exposes a way to delete it. Falls back to the original
    -- launch weights rather than raising, so a search never breaks.
    w := row(true, 0.35, 0.25, 0.20, 0.10, 0.10, now(), null)::public.ranking_weights;
  end if;

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
      select entity_id as school_id, max(priority) as sponsored_priority
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
        coalesce(sp.sponsored_priority, 0) as sponsored_priority,
        (
          (case when sp2.description is not null then 1 else 0 end)
          + (case when sp2.logo_url is not null then 1 else 0 end)
          + (case when sp2.website is not null then 1 else 0 end)
          + (case when sp2.instagram is not null then 1 else 0 end)
          + (case when sp2.whatsapp is not null then 1 else 0 end)
        )::numeric / 5 as completeness
      from base b
      left join ratings r on r.school_id = b.id
      left join lists l on l.school_id = b.id
      left join favs f on f.school_id = b.id
      left join sponsorship sp on sp.school_id = b.id
      left join public.school_profiles sp2 on sp2.school_id = b.id
    ),
    scored as (
      -- Every column referenced here must be qualified with `combined.`
      -- (or `w.` for the weights row) -- search_schools()'s RETURNS
      -- TABLE implicitly declares same-named PL/pgSQL variables, so a
      -- bare reference is ambiguous and fails to compile (see Prompt 06).
      select
        combined.*,
        (
          coalesce(case when combined.distance_km is not null then 1.0 / (1 + combined.distance_km) else 0.5 end, 0.5) * w.weight_distance
          + (least(combined.review_count + combined.favorite_count, 15)::numeric / 15) * w.weight_popularity
          + (least(combined.list_count, 5)::numeric / 5) * w.weight_lists
          + combined.completeness * w.weight_completeness
          + (case when combined.is_verified then 1 else 0 end) * w.weight_quality
        )::numeric(4, 3) as organic_score,
        (round(combined.avg_rating / 5, 3))::numeric(4, 3) as rating_score
      from combined
      where p_min_rating is null or combined.avg_rating >= p_min_rating
    )
    select
      s.id, s.inep_code, s.name, s.slug, s.uf, s.municipality,
      s.location_type, s.school_type, s.address, s.latitude, s.longitude,
      s.distance_km, s.avg_rating, s.rating_score, s.review_count, s.list_count, s.favorite_count,
      s.is_verified, s.is_sponsored, s.sponsored_priority, s.organic_score,
      count(*) over ()::bigint as total_count
    from scored s
    order by
      s.is_sponsored desc,
      s.sponsored_priority desc,
      case when p_sort = 'proximity' then s.distance_km end asc nulls last,
      case when p_sort = 'rating' then s.avg_rating end desc nulls last,
      case when p_sort = 'popularity' then (s.review_count + s.list_count + s.favorite_count) end desc nulls last,
      case when p_sort = 'relevance' or p_sort is null then s.organic_score end desc nulls last,
      s.name asc
    limit p_limit offset p_offset;
end;
$function$;

comment on function public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int) is
  'Resultados: filtros (tipo, etapa, avaliação mínima, nome), ordenação (relevance/proximity/popularity/rating), paginação. organic_score/rating_score/sponsored_priority stay three separate columns, never blended (PRD RF-003, RN-008) -- weights for organic_score come from ranking_weights (admin-configurable, Prompt 13), never hardcoded or client-supplied. SECURITY DEFINER (Prompt 13) so it can see real campaigns rows despite campaigns having admin-only RLS -- only the derived is_sponsored/sponsored_priority ever leave the function, the raw table stays admin-only.';

revoke execute on function public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int) from public;
grant execute on function public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int) to anon, authenticated;
