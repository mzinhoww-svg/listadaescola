-- Proximity search for schools (Prompt 05, PRD RF-002/RF-001, RN-009).
-- PostGIS computes distance when coordinates are known; without them,
-- falls back to município exact match, then CEP 5-digit-prefix match,
-- then a plain uf listing -- distance_km is NULL in every fallback path,
-- never fabricated. State-parameterized (p_uf), same reusability pattern
-- as merge_inep_staging() (docs/architecture/inep-import.md).
--
-- SECURITY INVOKER (default, stated explicitly): this only reads rows
-- already public via the `schools_select_active` RLS policy, so it runs
-- as whatever role calls it (anon/authenticated) and never needs to
-- bypass RLS. search_path includes `extensions` (not on the default
-- search_path) because PostGIS functions/operators (ST_Distance,
-- ST_DWithin, the `<->` KNN operator used by the schools_location_gix
-- GIST index) live there, same as the generated `schools.location`
-- column.

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

comment on function public.nearby_schools(text, numeric, numeric, text, text, numeric, int, int) is
  'Proximity search for schools: orders by PostGIS distance when lat/lon resolved, else falls back to município exact match, then CEP 5-digit-prefix match, then plain uf listing -- never fabricates distance_km (PRD RN-009). SECURITY INVOKER, relies on schools_select_active RLS; EXECUTE left at the Postgres default (granted to public/anon/authenticated) since the underlying data is already public.';
