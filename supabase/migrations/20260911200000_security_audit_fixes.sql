-- Prompt 16 (auditoria final de segurança) -- fixes for the findings in
-- docs/security/final-audit.md that a schema change can actually close.
-- Findings that require no schema change (Storage approval gate on
-- `public-assets`, security headers) are handled in the same PR's app
-- code/docs, not here.

-- ---------------------------------------------------------------------
-- Finding: is_admin()/is_staff()/is_school_manager()/is_store_manager()/
-- handle_new_user()/guard_submission_status_transition() still directly
-- callable by `anon` via PostgREST RPC.
--
-- Same no-op-revoke bug already found and fixed twice before
-- (20260911150100_moderation_guards_fix_public_grant.sql,
-- 20260911160100_admin_crud_fix_anon_grant.sql): `revoke ... from anon`
-- (20260910201900_advisor_fixes.sql) never actually removed anon's
-- access, because every function grants EXECUTE to PUBLIC at creation and
-- anon was never a direct grantee -- only PUBLIC itself can be revoked.
-- That earlier fix's own comment named these six functions explicitly as
-- "left for Prompt 16" -- this closes that.
--
-- Verified non-exploitable regardless (both audit agents confirmed live):
-- is_admin()/is_staff() only ever read the caller's own auth.uid(), which
-- is null for anon (-> always false); is_school_manager/is_store_manager
-- take a target id but still gate on auth.uid() internally, so an anon
-- caller gets false for any id; handle_new_user/guard_submission_status_
-- transition are `returns trigger`, which Postgres refuses to execute
-- outside trigger context regardless of grants. This is a hygiene fix for
-- the intended access model, not a live vulnerability.
--
-- `authenticated` keeps EXECUTE on the first four: RLS policies scoped to
-- that role (e.g. `stores_admin_all using (is_admin())`) evaluate these
-- functions as part of a normal authenticated user's own query, so
-- revoking there would break every admin-gated policy in the schema. The
-- two trigger functions get no re-grant -- nothing may ever call them
-- directly, by design.
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.is_school_manager(uuid) from public;
revoke execute on function public.is_store_manager(uuid) from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.guard_submission_status_transition() from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_school_manager(uuid) to authenticated;
grant execute on function public.is_store_manager(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Finding: search_schools()/nearby_schools()/nearby_stores() have no
-- upper bound on p_limit (or lower bound on p_offset) -- a caller with
-- only the public anon key can request e.g. p_limit=100000 in one call
-- and bypass the pagination the app itself always applies
-- (PAGE_SIZE = 20 in src/lib/schools/search-schools.ts). Not a privilege
-- boundary issue (every row returned is already reachable by paginating
-- the public UI, and RLS/is_active filtering is unaffected either way) --
-- just removes the friction that makes bulk-scraping the whole public
-- dataset in one request possible. admin_analytics_top_schools
-- (20260911180000_analytics_vendas.sql) already clamps p_limit between 1
-- and 50; applied here too, at 100 (double the app's largest real page
-- size) to leave headroom without being meaningless.
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
  p_limit := greatest(1, least(coalesce(p_limit, 20), 100));
  p_offset := greatest(0, coalesce(p_offset, 0));

  select * into w from public.ranking_weights where ranking_weights.id = true;
  if w is null then
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

create or replace function public.nearby_schools(
  p_uf text default 'MT',
  p_lat numeric default null,
  p_lon numeric default null,
  p_municipality text default null,
  p_cep text default null,
  p_radius_km numeric default null,
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
  cep text,
  distance_km numeric
)
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $function$
declare
  v_point geography;
begin
  p_limit := greatest(1, least(coalesce(p_limit, 20), 100));
  p_offset := greatest(0, coalesce(p_offset, 0));

  if p_lat is not null and p_lon is not null then
    v_point := ST_SetSRID(ST_MakePoint(p_lon::float8, p_lat::float8), 4326)::geography;
  end if;

  if v_point is not null then
    return query
      select
        s.id, s.inep_code, s.name, s.slug, s.uf, s.municipality,
        s.location_type, s.school_type, s.address, s.latitude, s.longitude, s.cep,
        round((ST_Distance(s.location, v_point) / 1000)::numeric, 2) as distance_km
      from public.schools s
      where s.is_active
        and s.uf = p_uf
        and s.location is not null
        and (p_radius_km is null or ST_DWithin(s.location, v_point, p_radius_km * 1000))
      order by s.location <-> v_point
      limit p_limit offset p_offset;
  elsif p_municipality is not null and btrim(p_municipality) <> '' then
    return query
      select
        s.id, s.inep_code, s.name, s.slug, s.uf, s.municipality,
        s.location_type, s.school_type, s.address, s.latitude, s.longitude, s.cep,
        null::numeric as distance_km
      from public.schools s
      where s.is_active
        and s.uf = p_uf
        and s.municipality ilike btrim(p_municipality)
      order by s.name
      limit p_limit offset p_offset;
  elsif p_cep is not null and regexp_replace(p_cep, '\D', '', 'g') <> '' then
    return query
      select
        s.id, s.inep_code, s.name, s.slug, s.uf, s.municipality,
        s.location_type, s.school_type, s.address, s.latitude, s.longitude, s.cep,
        null::numeric as distance_km
      from public.schools s
      where s.is_active
        and s.uf = p_uf
        and s.cep is not null
        and left(regexp_replace(s.cep, '\D', '', 'g'), 5) = left(regexp_replace(p_cep, '\D', '', 'g'), 5)
      order by s.name
      limit p_limit offset p_offset;
  else
    return query
      select
        s.id, s.inep_code, s.name, s.slug, s.uf, s.municipality,
        s.location_type, s.school_type, s.address, s.latitude, s.longitude, s.cep,
        null::numeric as distance_km
      from public.schools s
      where s.is_active
        and s.uf = p_uf
      order by s.name
      limit p_limit offset p_offset;
  end if;
end;
$function$;

create or replace function public.nearby_stores(
  p_uf text default 'MT',
  p_lat numeric default null,
  p_lon numeric default null,
  p_municipality text default null,
  p_radius_km numeric default null,
  p_limit int default 10,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  slug text,
  uf text,
  municipality text,
  address text,
  whatsapp text,
  opening_hours text,
  offers_delivery boolean,
  offers_pickup boolean,
  distance_km numeric
)
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $function$
declare
  v_point geography;
begin
  p_limit := greatest(1, least(coalesce(p_limit, 10), 100));
  p_offset := greatest(0, coalesce(p_offset, 0));

  if p_lat is not null and p_lon is not null then
    v_point := ST_SetSRID(ST_MakePoint(p_lon::float8, p_lat::float8), 4326)::geography;
  end if;

  if v_point is not null then
    return query
      with ranked as (
        select
          s.id, s.name, s.slug, s.uf, s.municipality, s.address,
          s.whatsapp, s.opening_hours, s.offers_delivery, s.offers_pickup,
          round((ST_Distance(s.location, v_point) / 1000)::numeric, 2) as distance_km,
          0 as rank_group
        from public.stores s
        where s.is_active
          and s.uf = p_uf
          and s.location is not null
          and (p_radius_km is null or ST_DWithin(s.location, v_point, p_radius_km * 1000))
      ),
      unranked as (
        select
          s.id, s.name, s.slug, s.uf, s.municipality, s.address,
          s.whatsapp, s.opening_hours, s.offers_delivery, s.offers_pickup,
          null::numeric as distance_km,
          1 as rank_group
        from public.stores s
        where s.is_active
          and s.uf = p_uf
          and s.location is null
          and p_municipality is not null
          and btrim(p_municipality) <> ''
          and s.municipality ilike btrim(p_municipality)
      ),
      combined as (
        select * from ranked
        union all
        select * from unranked
      )
      select
        combined.id, combined.name, combined.slug, combined.uf, combined.municipality, combined.address,
        combined.whatsapp, combined.opening_hours, combined.offers_delivery, combined.offers_pickup,
        combined.distance_km
      from combined
      order by combined.rank_group, combined.distance_km nulls last, combined.name
      limit p_limit offset p_offset;
  elsif p_municipality is not null and btrim(p_municipality) <> '' then
    return query
      select
        s.id, s.name, s.slug, s.uf, s.municipality, s.address,
        s.whatsapp, s.opening_hours, s.offers_delivery, s.offers_pickup,
        null::numeric as distance_km
      from public.stores s
      where s.is_active
        and s.uf = p_uf
        and s.municipality ilike btrim(p_municipality)
      order by s.name
      limit p_limit offset p_offset;
  else
    return query
      select
        s.id, s.name, s.slug, s.uf, s.municipality, s.address,
        s.whatsapp, s.opening_hours, s.offers_delivery, s.offers_pickup,
        null::numeric as distance_km
      from public.stores s
      where s.is_active
        and s.uf = p_uf
      order by s.name
      limit p_limit offset p_offset;
  end if;
end;
$function$;

-- ---------------------------------------------------------------------
-- Finding: school_profiles.website is rendered as a raw <a href> on the
-- public school page (src/app/(public)/escolas/[uf]/[cidade]/[slug]/page.tsx)
-- with no URL-scheme validation anywhere -- an admin (or, via the
-- school_profiles_manager_write/update RLS policies, a school manager
-- calling PostgREST directly, bypassing the app entirely) could store
-- `javascript:...`, executed same-origin when a visitor clicks the link.
-- A CHECK constraint is the one enforcement point that covers every write
-- path (admin_update_school RPC below AND a direct manager RLS write) --
-- no existing rows violate it (checked live before adding). Mirrors the
-- allowlist-scheme pattern already used for outbound commerce links
-- (parseTrustedExternalUrl() in src/app/api/commerce/click/route.ts).
alter table public.school_profiles
  add constraint school_profiles_website_scheme_check
  check (website is null or website ~ '^https?://');

-- Same validation, restated as a friendly admin-facing error instead of a
-- raw constraint-violation message -- same convention as the other
-- `raise exception` input checks already in this function/its siblings
-- (admin_upsert_store, admin_upsert_ecommerce_partner, ...).
create or replace function public.admin_update_school(
  p_school_id uuid,
  p_is_active boolean,
  p_description text,
  p_logo_url text,
  p_website text,
  p_instagram text,
  p_whatsapp text,
  p_is_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school public.schools;
  v_profile_before public.school_profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins may update schools';
  end if;
  if nullif(trim(p_website), '') is not null and trim(p_website) !~ '^https?://' then
    raise exception 'website must start with http:// or https://';
  end if;

  select * into v_school from public.schools where id = p_school_id for update;
  if v_school is null then
    raise exception 'school % not found', p_school_id;
  end if;

  select * into v_profile_before from public.school_profiles where school_id = p_school_id;

  update public.schools set is_active = p_is_active where id = p_school_id;

  insert into public.school_profiles (school_id, description, logo_url, website, instagram, whatsapp, is_verified, updated_by)
  values (
    p_school_id, nullif(trim(p_description), ''), nullif(trim(p_logo_url), ''),
    nullif(trim(p_website), ''), nullif(trim(p_instagram), ''), nullif(trim(p_whatsapp), ''),
    p_is_verified, auth.uid()
  )
  on conflict (school_id) do update set
    description = excluded.description,
    logo_url = excluded.logo_url,
    website = excluded.website,
    instagram = excluded.instagram,
    whatsapp = excluded.whatsapp,
    is_verified = excluded.is_verified,
    updated_by = auth.uid();

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'ADMIN_UPDATE_SCHOOL', 'schools', p_school_id,
    jsonb_build_object('school', to_jsonb(v_school), 'profile', to_jsonb(v_profile_before)),
    jsonb_build_object(
      'is_active', p_is_active, 'description', p_description, 'logo_url', p_logo_url,
      'website', p_website, 'instagram', p_instagram, 'whatsapp', p_whatsapp, 'is_verified', p_is_verified
    )
  );
end;
$$;
