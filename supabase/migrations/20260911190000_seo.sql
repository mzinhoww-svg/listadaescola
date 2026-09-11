-- Prompt 15 (SEO técnico): PRD §14 -- "Páginas públicas e indexáveis:
-- cidade/estado; escola; lista escolar; papelaria; páginas
-- institucionais." Estado/cidade never had their own indexable routes
-- before this prompt (only reachable as ?uf=/&municipality= filters on
-- /escolas) -- already flagged as this prompt's job in
-- home-busca-resultados.md. These two read-only helpers resolve a URL
-- city slug back to the real municipality name (needed because
-- /escolas/[uf]/[cidade] must actually filter schools by city, unlike the
-- school detail page's [uf]/[cidade] segments, which are cosmetic-only)
-- and list the cities worth linking to from the estado landing page.
--
-- SECURITY INVOKER (not DEFINER): both only read `schools`, which is
-- already publicly SELECT-able for active rows via schools_select_active
-- -- no RLS to bypass, same reasoning already applied to
-- admin_analytics_event_counts/admin_analytics_top_schools (Prompt 14).
-- Every column reference qualified with the `s.` alias, same discipline,
-- to avoid the RETURNS TABLE implicit-variable trap (search_schools,
-- Prompt 06/13) even though neither name here happens to collide today.

create or replace function public.resolve_municipality_slug(p_uf text, p_slug text)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select s.municipality
  from public.schools s
  where s.is_active
    and s.uf = p_uf
    and public.slugify(s.municipality) = p_slug
  limit 1;
$$;

create or replace function public.list_municipalities(p_uf text)
returns table (municipality text, school_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $function$
begin
  return query
    select s.municipality, count(*)::bigint
    from public.schools s
    where s.is_active and s.uf = p_uf
    group by s.municipality
    order by count(*) desc, s.municipality asc;
end;
$function$;

revoke execute on function public.resolve_municipality_slug(text, text) from public;
revoke execute on function public.list_municipalities(text) from public;
revoke execute on function public.resolve_municipality_slug(text, text) from anon;
revoke execute on function public.list_municipalities(text) from anon;
grant execute on function public.resolve_municipality_slug(text, text) to anon, authenticated;
grant execute on function public.list_municipalities(text) to anon, authenticated;
