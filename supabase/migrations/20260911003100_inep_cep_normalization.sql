-- Normalize CEP to #####-### at merge time (docs/architecture/inep-import.md,
-- regra 3). Staging keeps the raw/original value untouched; only the copy
-- written to public.schools is reformatted. MT's source data already came
-- pre-formatted (0 rows needed this), but future states (GO, RO, MS) may not.
-- Falls back to the trimmed raw value when it doesn't cleanly resolve to
-- 8 digits, rather than fabricating a CEP from malformed input.

create or replace function public.merge_inep_staging(
  p_state_code text,
  p_lat_min numeric default -33.75,
  p_lat_max numeric default 5.27,
  p_lon_min numeric default -73.99,
  p_lon_max numeric default -32.39
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $function$
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
      case
        when regexp_replace(coalesce(raw_cep, ''), '\D', '', 'g') ~ '^[0-9]{8}$'
          then substring(regexp_replace(raw_cep, '\D', '', 'g') from 1 for 5)
            || '-' || substring(regexp_replace(raw_cep, '\D', '', 'g') from 6 for 3)
        else nullif(btrim(raw_cep), '')
      end as cep,
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
$function$;

revoke execute on function public.merge_inep_staging(text, numeric, numeric, numeric, numeric) from public, anon, authenticated;
