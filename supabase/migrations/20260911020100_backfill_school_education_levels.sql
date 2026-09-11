-- Data backfill, not a schema change: school_education_levels (schema
-- from Prompt 02, index school_education_levels_school_id_idx sitting
-- unused since then) was never populated by the Prompt 04 INEP import --
-- that import only wrote schools.education_offerings as raw comma-
-- separated text (e.g. "Educação Infantil, Ensino Fundamental").
-- Prompt 06's "etapa" filter (search_schools(), p_education_level) reads
-- from school_education_levels, so without this it would silently match
-- zero schools for every value.
--
-- Source is the same already-imported, already-validated INEP data --
-- this only normalizes it into the table designed to receive it, it
-- doesn't touch schools or fabricate anything. Confirmed exactly 5
-- distinct comma-separated values across all 2.722 MT schools (23 have
-- NULL education_offerings, left as-is, no level rows for those).
-- Idempotent: on conflict (school_id, education_level) do nothing.

insert into public.school_education_levels (school_id, education_level)
select s.id, btrim(level)
from public.schools s
cross join lateral unnest(string_to_array(s.education_offerings, ',')) as level
where s.uf = 'MT'
  and s.is_active
  and s.education_offerings is not null
  and btrim(level) <> ''
on conflict (school_id, education_level) do nothing;
