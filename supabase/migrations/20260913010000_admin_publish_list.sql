-- Onda 4 (docs/product/roadmap-ondas.md §0). O gargalo do produto inteiro.
--
-- Até aqui, a ÚNICA criação de public.school_lists no sistema estava dentro
-- de approve_submission() (20260911150000_moderation_guards.sql:70). Somado
-- ao guard de auto-aprovação da mesma migration ("you cannot review your own
-- submission"), o encadeamento fechava em si mesmo: para publicar uma lista
-- eram necessárias DUAS contas -- uma para enviar pelo wizard, outra para
-- aprovar -- e criar a segunda exige confirmação por e-mail, que exige SMTP,
-- que não está configurado. Resultado: ninguém conseguia publicar uma única
-- lista. O catálogo tinha 2.722 escolas e 0 listas.
--
-- Esta função dá ao admin o caminho direto. Não é um atalho de moderação:
-- moderação existe para conteúdo enviado por terceiros, e não há terceiro
-- aqui -- o admin é a fonte. Por isso NÃO há guard de auto-aprovação, e por
-- isso a ação tem nome próprio no audit log, distinguível de APPROVE_SUBMISSION.
--
-- Publicar de novo a mesma (escola, etapa, série, ano) NÃO sobrescreve: cria
-- uma versão nova, preservando o histórico (RN-007). É a mesma mecânica de
-- approve_submission, deliberadamente.

create or replace function public.admin_publish_list(
  p_school_id uuid,
  p_education_level text,
  p_series_name text,
  p_school_year int,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school public.schools;
  v_list_id uuid;
  v_version_id uuid;
  v_next_version int;
  v_slug text;
  v_slug_base text;
  v_suffix int := 1;
  v_item_count int;
begin
  if not public.is_admin() then
    raise exception 'only admins may publish lists';
  end if;

  select * into v_school from public.schools where id = p_school_id;
  if v_school is null then
    raise exception 'school % not found', p_school_id;
  end if;
  if not v_school.is_active then
    raise exception 'school % is not active', p_school_id;
  end if;

  if p_education_level is null or btrim(p_education_level) = '' then
    raise exception 'education_level is required';
  end if;
  if p_series_name is null or btrim(p_series_name) = '' then
    raise exception 'series_name is required';
  end if;
  if p_school_year is null or p_school_year < 2000 or p_school_year > 2100 then
    raise exception 'school_year % is out of range', p_school_year;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be a json array';
  end if;
  select count(*) into v_item_count from jsonb_array_elements(p_items);
  if v_item_count = 0 then
    raise exception 'a list needs at least one item';
  end if;

  -- Mesma chave da unique constraint school_lists_school_id_education_level_
  -- series_name_school_y_key: publicar de novo reaproveita a lista e só
  -- acrescenta versão.
  select id into v_list_id
  from public.school_lists
  where school_id = p_school_id
    and education_level = btrim(p_education_level)
    and series_name = btrim(p_series_name)
    and school_year = p_school_year;

  if v_list_id is null then
    v_slug_base := public.slugify(
      coalesce(v_school.slug, p_school_id::text)
      || '-' || p_school_year::text
      || '-' || btrim(p_series_name)
    );
    v_slug := v_slug_base;
    -- approve_submission() não trata colisão de slug e estoura na unique.
    -- Duas séries de nomes diferentes podem gerar o mesmo slug depois do
    -- slugify (acento, pontuação), então aqui a colisão é resolvida.
    while exists (select 1 from public.school_lists where slug = v_slug) loop
      v_suffix := v_suffix + 1;
      v_slug := v_slug_base || '-' || v_suffix::text;
    end loop;

    insert into public.school_lists (school_id, education_level, series_name, school_year, slug)
    values (p_school_id, btrim(p_education_level), btrim(p_series_name), p_school_year, v_slug)
    returning id into v_list_id;
  else
    -- Republicar uma lista arquivada a devolve ao ar, junto com a versão nova.
    update public.school_lists set status = 'APPROVED', updated_at = now() where id = v_list_id;
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_version
  from public.school_list_versions where school_list_id = v_list_id;

  -- submission_id fica null: não veio de contribuição de terceiro.
  insert into public.school_list_versions (school_list_id, version_number, status, submission_id, published_by)
  values (v_list_id, v_next_version, 'PUBLISHED', null, auth.uid())
  returning id into v_version_id;

  insert into public.school_list_items
    (school_list_version_id, name, quantity, unit, brand, is_required, notes, sort_order)
  select
    v_version_id,
    btrim(item.value ->> 'name'),
    greatest(1, coalesce((item.value ->> 'quantity')::int, 1)),
    nullif(btrim(coalesce(item.value ->> 'unit', '')), ''),
    nullif(btrim(coalesce(item.value ->> 'brand', '')), ''),
    coalesce((item.value ->> 'is_required')::boolean, true),
    nullif(btrim(coalesce(item.value ->> 'notes', '')), ''),
    (item.ordinality - 1)::int
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality)
  where btrim(coalesce(item.value ->> 'name', '')) <> '';

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'ADMIN_PUBLISH_LIST', 'school_lists', v_list_id,
    null,
    jsonb_build_object(
      'school_list_version_id', v_version_id,
      'version_number', v_next_version,
      'school_id', p_school_id,
      'education_level', btrim(p_education_level),
      'series_name', btrim(p_series_name),
      'school_year', p_school_year,
      'item_count', v_item_count
    )
  );

  return v_version_id;
end;
$$;

comment on function public.admin_publish_list(uuid, text, text, int, jsonb) is
  'Onda 4: caminho direto do admin para publicar lista, sem passar pelo wizard de contribuição nem pela moderação. Sem guard de auto-aprovação de propósito -- não há terceiro envolvido, o admin é a fonte. Republicar a mesma (escola, etapa, série, ano) cria versão nova, nunca sobrescreve (RN-007). SECURITY DEFINER, exige is_admin().';

revoke execute on function public.admin_publish_list(uuid, text, text, int, jsonb) from public;
grant execute on function public.admin_publish_list(uuid, text, text, int, jsonb) to authenticated;
