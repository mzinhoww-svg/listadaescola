-- Pin search_path on INEP import pipeline functions (flagged by security advisor:
-- function_search_path_mutable). Both functions are SECURITY INVOKER and only
-- reference public/pg_catalog objects, but pinning search_path is cheap and
-- removes any risk of search_path hijacking via a role's session settings.

alter function public.inep_reconstruct_coordinate(text, integer[], numeric, numeric)
  set search_path = public, pg_temp;

alter function public.merge_inep_staging(text, numeric, numeric, numeric, numeric)
  set search_path = public, pg_temp;
