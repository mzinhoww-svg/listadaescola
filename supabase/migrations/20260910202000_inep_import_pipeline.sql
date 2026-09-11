-- INEP import pipeline (Prompt 04) -- staging table + merge function.
--
-- Architecture: CSV -> staging (raw text, untyped) -> merge_inep_staging()
-- (validation + normalization + upsert). The CSV-parsing step lives
-- outside Postgres (scripts/import-inep.ts) since Postgres can't read an
-- arbitrary local file; everything else -- the part that actually decides
-- what ends up in `schools` -- lives here as a reviewable, callable SQL
-- function so it can be re-verified directly (via execute_sql or any
-- future caller) without needing the CSV-parsing script at all.
--
-- Real bug discovered in the source export (see docs/architecture/
-- inep-import.md): latitude/longitude arrive with their decimal point
-- stripped and the resulting integer re-grouped by thousands (e.g.
-- "-13.42655851" becomes "-1.342.655.851"). inep_reconstruct_coordinate()
-- reverses this deterministically using each column's known digit count
-- before the decimal point, disambiguated by a plausible bounding box --
-- never guessed, never fabricated: if no candidate lands in range, the
-- coordinate becomes NULL (schools without recoverable coordinates stay
-- valid and locatable by CEP/município, per PRD RN-004).

create table public.inep_import_staging (
  id bigint generated always as identity primary key,
  raw_inep_code text,
  raw_name text,
  raw_uf text,
  raw_municipality text,
  raw_location_type text,
  raw_differentiated_location text,
  raw_school_type text,
  raw_address text,
  raw_phone text,
  raw_administrative_dependency text,
  raw_private_school_category text,
  raw_public_power_agreement text,
  raw_education_council_regulation text,
  raw_school_size text,
  raw_education_offerings text,
  raw_other_education_offerings text,
  raw_attendance_restriction text,
  raw_latitude text,
  raw_longitude text,
  raw_cep text,
  raw_cep_source text,
  loaded_at timestamptz not null default now()
);

-- Internal staging table, never meant for any client role -- RLS with zero
-- policies denies everyone except the privileged connection (SEC-001
-- applies to every public-schema table, no carve-out for "internal").
alter table public.inep_import_staging enable row level security;

create index inep_import_staging_uf_idx on public.inep_import_staging (raw_uf);

comment on table public.inep_import_staging is
  'Raw, untyped mirror of the INEP census export, loaded by scripts/import-inep.ts. Truncate-and-reload per run; merge_inep_staging() reads from here.';

-- Reverses the thousands-grouping corruption described above. Tries each
-- candidate integer-digit-count in order and returns the first
-- reconstruction that falls within [lo, hi]; returns NULL if none does
-- (including when raw is empty/NULL) -- never returns an out-of-range or
-- fabricated guess.
create or replace function public.inep_reconstruct_coordinate(
  raw text,
  candidate_int_digits int[],
  lo numeric,
  hi numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  digits text;
  is_negative boolean;
  cand int;
  candidate_value numeric;
begin
  if raw is null or btrim(raw) = '' then
    return null;
  end if;

  is_negative := left(btrim(raw), 1) = '-';
  digits := regexp_replace(raw, '[^0-9]', '', 'g');

  foreach cand in array candidate_int_digits loop
    if length(digits) > cand then
      candidate_value := (left(digits, cand) || '.' || substring(digits from cand + 1))::numeric;
      if is_negative then
        candidate_value := -candidate_value;
      end if;
      if candidate_value between lo and hi then
        return candidate_value;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

revoke execute on function public.inep_reconstruct_coordinate(text, int[], numeric, numeric) from public, anon, authenticated;

-- Validates, normalizes and upserts staged rows for one state into
-- `schools`, then reports what it did. Only ever writes the INEP-controlled
-- columns documented in docs/architecture/inep-import.md -- `slug` is set
-- once at insert and never touched again (stable URLs), and editorial
-- columns (school_profiles, is_active, etc.) are never referenced here at
-- all. The `where ... is distinct from ...` guard makes a re-run with
-- unchanged source data a true no-op, not just "no duplicate rows".
--
-- Longitude always has exactly 2 integer digits for any point in Brazil;
-- latitude can have 1 or 2 (try 2 first -- true for the vast majority of
-- the country -- then fall back to 1). Bounding box defaults to Brazil's
-- overall extent so this is reusable for other states (see "Estratégia de
-- expansão" in inep-import.md); pass tighter bounds for better
-- disambiguation when known (MT: -19/-6.5 lat, -62.5/-49 lon).
create or replace function public.merge_inep_staging(
  p_state_code text,
  p_lat_min numeric default -33.75,
  p_lat_max numeric default 5.27,
  p_lon_min numeric default -73.99,
  p_lon_max numeric default -32.39
)
returns jsonb
language plpgsql
as $$
declare
  v_staged_count int;
  v_bad_school_type_count int;
  v_inserted_count int;
  v_updated_count int;
  v_unchanged_count int;
  v_missing_coords_count int;
begin
  select count(*) into v_staged_count
  from public.inep_import_staging
  where raw_uf = p_state_code;

  select count(*) into v_bad_school_type_count
  from public.inep_import_staging
  where raw_uf = p_state_code
    and raw_school_type not in ('Pública', 'Privada');

  with normalized as (
    select
      btrim(raw_inep_code) as inep_code,
      btrim(raw_name) as name,
      raw_uf as uf,
      btrim(raw_municipality) as municipality,
      case raw_location_type
        when 'Urbana' then 'URBAN'::public.location_type
        when 'Rural' then 'RURAL'::public.location_type
        else null
      end as location_type,
      nullif(btrim(raw_differentiated_location), '') as differentiated_location,
      case raw_school_type
        when 'Pública' then 'PUBLIC'::public.school_type
        when 'Privada' then 'PRIVATE'::public.school_type
      end as school_type,
      nullif(btrim(raw_address), '') as address,
      nullif(btrim(raw_phone), '') as phone,
      nullif(btrim(raw_administrative_dependency), '') as administrative_dependency,
      nullif(btrim(raw_private_school_category), '') as private_school_category,
      nullif(btrim(raw_public_power_agreement), '') as public_power_agreement,
      nullif(btrim(raw_education_council_regulation), '') as education_council_regulation,
      nullif(btrim(raw_school_size), '') as school_size,
      nullif(btrim(raw_education_offerings), '') as education_offerings,
      nullif(btrim(raw_other_education_offerings), '') as other_education_offerings,
      nullif(btrim(raw_attendance_restriction), '') as attendance_restriction,
      public.inep_reconstruct_coordinate(raw_latitude, array[2, 1], p_lat_min, p_lat_max) as latitude,
      public.inep_reconstruct_coordinate(raw_longitude, array[2], p_lon_min, p_lon_max) as longitude,
      nullif(btrim(raw_cep), '') as cep,
      nullif(btrim(raw_cep_source), '') as cep_source
    from public.inep_import_staging
    where raw_uf = p_state_code
      and raw_school_type in ('Pública', 'Privada')
      and coalesce(btrim(raw_inep_code), '') <> ''
  ),
  upserted as (
    insert into public.schools (
      inep_code, name, slug, uf, municipality, location_type,
      differentiated_location, school_type, address, phone,
      administrative_dependency, private_school_category,
      public_power_agreement, education_council_regulation, school_size,
      education_offerings, other_education_offerings, attendance_restriction,
      latitude, longitude, cep, cep_source, source
    )
    select
      inep_code, name,
      public.slugify(name) || '-' || public.slugify(municipality) || '-' || right(inep_code, 4),
      uf, municipality, location_type, differentiated_location, school_type,
      address, phone, administrative_dependency, private_school_category,
      public_power_agreement, education_council_regulation, school_size,
      education_offerings, other_education_offerings, attendance_restriction,
      latitude, longitude, cep, cep_source, 'INEP'
    from normalized
    on conflict (inep_code) do update set
      name = excluded.name,
      municipality = excluded.municipality,
      location_type = excluded.location_type,
      differentiated_location = excluded.differentiated_location,
      school_type = excluded.school_type,
      address = excluded.address,
      phone = excluded.phone,
      administrative_dependency = excluded.administrative_dependency,
      private_school_category = excluded.private_school_category,
      public_power_agreement = excluded.public_power_agreement,
      education_council_regulation = excluded.education_council_regulation,
      school_size = excluded.school_size,
      education_offerings = excluded.education_offerings,
      other_education_offerings = excluded.other_education_offerings,
      attendance_restriction = excluded.attendance_restriction,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      cep = excluded.cep,
      cep_source = excluded.cep_source,
      updated_at = now()
    where (
      schools.name, schools.municipality, schools.location_type,
      schools.differentiated_location, schools.school_type, schools.address,
      schools.phone, schools.administrative_dependency,
      schools.private_school_category, schools.public_power_agreement,
      schools.education_council_regulation, schools.school_size,
      schools.education_offerings, schools.other_education_offerings,
      schools.attendance_restriction, schools.latitude, schools.longitude,
      schools.cep, schools.cep_source
    ) is distinct from (
      excluded.name, excluded.municipality, excluded.location_type,
      excluded.differentiated_location, excluded.school_type, excluded.address,
      excluded.phone, excluded.administrative_dependency,
      excluded.private_school_category, excluded.public_power_agreement,
      excluded.education_council_regulation, excluded.school_size,
      excluded.education_offerings, excluded.other_education_offerings,
      excluded.attendance_restriction, excluded.latitude, excluded.longitude,
      excluded.cep, excluded.cep_source
    )
    returning (xmax = 0) as was_insert
  )
  select
    count(*) filter (where was_insert),
    count(*) filter (where not was_insert)
  into v_inserted_count, v_updated_count
  from upserted;

  select count(*) into v_unchanged_count
  from public.schools
  where uf = p_state_code
    and inep_code in (select raw_inep_code from public.inep_import_staging where raw_uf = p_state_code)
  ;
  v_unchanged_count := v_unchanged_count - v_inserted_count - v_updated_count;

  select count(*) into v_missing_coords_count
  from public.schools
  where uf = p_state_code and (latitude is null or longitude is null);

  return jsonb_build_object(
    'state_code', p_state_code,
    'staged_rows', v_staged_count,
    'rows_skipped_bad_school_type', v_bad_school_type_count,
    'inserted', v_inserted_count,
    'updated', v_updated_count,
    'unchanged', v_unchanged_count,
    'schools_missing_coordinates', v_missing_coords_count
  );
end;
$$;

revoke execute on function public.merge_inep_staging(text, numeric, numeric, numeric, numeric) from public, anon, authenticated;
