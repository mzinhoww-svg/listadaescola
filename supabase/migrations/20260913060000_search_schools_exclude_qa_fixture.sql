-- Onda 3 (rastro): a última porta por onde a fixture de QA vazava para o
-- público.
--
-- `src/lib/qa/fixtures.ts` marca a lista de teste com o prefixo de slug
-- `qa-teste-`, e esse prefixo já era filtrado no sitemap, no metadata
-- (`robots: noindex`), na home (`getRecentLists`) e na cobertura
-- (`getCoverageSummary`). Faltava aqui.
--
-- O sintoma era uma contradição na própria tela: buscar "Tia Coruja" no
-- catálogo mostrava "1 lista" -- porque `list_count` contava a fixture --
-- enquanto a seção de cobertura da home, na mesma sessão, dizia 0 listas.
-- Verificado no banco em 2026-09-13: existe exatamente 1 `school_lists`
-- com status APPROVED, e ela é a fixture. Ou seja, 100% do `list_count`
-- exibido hoje era conteúdo fictício.
--
-- Além do número errado, o `list_count` alimenta o `organic_score` do
-- ranking (peso `weight_lists`), então a fixture também empurrava uma
-- escola real para cima na ordenação.
--
-- Assinatura idêntica à de `20260913000000_search_schools_has_list.sql`:
-- CREATE OR REPLACE aqui SUBSTITUI de fato, não cria sobrecarga -- e por
-- isso os grants existentes continuam válidos e não precisam ser refeitos.
--
-- Como remover quando a fixture sair: apagar o `and sl.slug not like`
-- abaixo e reaplicar. Uma linha, uma migration.
--
-- Nota de incidente: a primeira versão desta migration escreveu `slug` sem
-- qualificar a tabela. `slug` é OUT parameter desta função, então o
-- PL/pgSQL levantou 42702 (ambiguous) em TODA chamada -- o catálogo
-- inteiro caiu por ~2 minutos em 2026-09-13 até a correção abaixo. O CTE
-- `lists` agora usa alias explícito. Verificado depois: Tia Coruja voltou
-- a list_count 0, total do catálogo 2.722, p_sort='lists' funcionando,
-- uma única assinatura, grant de anon intacto.

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
  p_offset int default 0,
  p_has_list boolean default null
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
  p_radius_km := greatest(1, least(coalesce(p_radius_km, 100), 300));

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
      -- `sl.` obrigatório, não estilo: `slug` também é OUT parameter desta
      -- função, e um `slug` sem qualificação dá 42702 (ambiguous). Mesma
      -- armadilha de 20260911170100_ranking_patrocinio_fix_ambiguous_id.sql.
      select sl.school_id, count(*)::int as list_count
      from public.school_lists sl
      where sl.status = 'APPROVED'
        -- Fixture de QA nunca conta como oferta real. Mesma regra de
        -- src/lib/qa/fixtures.ts (QA_FIXTURE_SLUG_PREFIX) e de
        -- docs/operations/qa-fixtures.md.
        and sl.slug not like 'qa-teste-%'
      group by sl.school_id
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
      where (p_min_rating is null or combined.avg_rating >= p_min_rating)
        -- Filtro novo. Fica aqui, junto do p_min_rating, porque list_count só
        -- existe depois do join do CTE `lists`.
        and (
          p_has_list is null
          or (p_has_list and combined.list_count > 0)
          or (not p_has_list and combined.list_count = 0)
        )
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
      case when p_sort = 'lists' then s.list_count end desc nulls last,
      case when p_sort = 'popularity' then (s.review_count + s.list_count + s.favorite_count) end desc nulls last,
      case when p_sort = 'relevance' or p_sort is null then s.organic_score end desc nulls last,
      s.name asc
    limit p_limit offset p_offset;
end;
$function$;

comment on function public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int, boolean) is
  'Busca de escolas com ranking orgânico + patrocínio. p_has_list filtra por disponibilidade de lista publicada (true/false/null=todas) e p_sort=''lists'' ordena por list_count -- Onda 2 P2/P3: o catálogo precisa saber dizer quais escolas têm lista. SECURITY DEFINER, respeita schools_select_active. list_count exclui a fixture de QA (prefixo de slug qa-teste-).';

revoke execute on function public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int, boolean) from public;
grant execute on function public.search_schools(text, numeric, numeric, text, text, text, numeric, public.school_type, text, numeric, text, int, int, boolean) to anon, authenticated;
