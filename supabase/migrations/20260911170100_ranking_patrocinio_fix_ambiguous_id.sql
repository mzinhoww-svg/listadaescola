-- Follow-up to 20260911170000_ranking_patrocinio.sql, caught immediately
-- by running the function for real (execute_sql) rather than trusting it
-- compiled clean.
--
-- Exact same trap this file's own comments already warn about for
-- distance_km/list_count/is_verified/review_count/avg_rating (Prompt 06):
-- search_schools()'s RETURNS TABLE declares an `id` column, which becomes
-- an implicit PL/pgSQL variable named `id` in scope for the whole
-- function body. `select * into w from public.ranking_weights where id =
-- true` is ambiguous between that variable and ranking_weights.id --
-- fails at call time with "column reference \"id\" is ambiguous", not at
-- CREATE FUNCTION time (plpgsql only checks this when the statement
-- actually runs). Fixed by qualifying with the table name, same fix
-- style as the CTE-qualification comment already in this function.
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
