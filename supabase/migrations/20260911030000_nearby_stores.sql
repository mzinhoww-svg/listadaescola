-- Proximity search for papelarias (Prompt 09, PRD RF-011, RN-009). Same
-- fallback philosophy as nearby_schools() (Prompt 05) -- PostGIS distance
-- when coordinates are known, município exact match otherwise, plain uf
-- listing as the last resort -- distance_km is NULL in every path that
-- isn't real PostGIS distance, never fabricated. No CEP fallback here
-- (unlike nearby_schools): this is always called with a school's own
-- already-resolved location (lat/lon or município), never a CEP a
-- visitor typed.
--
-- Unlike nearby_schools(), the coordinate path and the município path
-- are not mutually exclusive: papelarias are admin-entered one at a time
-- (no bulk-geocoded import like INEP), so it's expected that some in a
-- município have no lat/lon yet. When the escola has coordinates, this
-- still surfaces município-matched papelarias that lack their own
-- coordinates -- ranked after the real-distance ones, with distance_km
-- left NULL -- instead of silently dropping them from the list.
--
-- SECURITY INVOKER (default, stated explicitly): only reads rows already
-- public via stores_select_active RLS.

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

comment on function public.nearby_stores(text, numeric, numeric, text, numeric, int, int) is
  'Proximity search for papelarias: PostGIS distance when lat/lon resolved (always the anchor escola''s own location, never a visitor''s) combined with município-matched papelarias that lack their own coordinates (ranked after, distance_km NULL), else falls back to município exact match, then plain uf listing -- never fabricates distance_km (PRD RN-009). SECURITY INVOKER, relies on stores_select_active RLS.';
