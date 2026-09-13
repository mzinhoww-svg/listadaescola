-- Bug real encontrado testando o caminho de colisão ao vivo (não só
-- typecheck/build): `returns table (submission_id uuid, collided boolean)`
-- cria variáveis de saída com esses nomes, visíveis em toda a função --
-- `delete from public.submission_items where submission_id = v_submission_id`
-- ficou ambíguo entre a coluna da tabela e a variável de saída
-- (42702, só disparava no branch de colisão, por isso passou despercebido
-- no primeiro teste sem colisão). Mesma assinatura -- create or replace
-- basta, sem drop.
create or replace function public.materialize_local_draft(
  p_school_id uuid,
  p_education_level text,
  p_series_name text,
  p_school_year int,
  p_items jsonb
)
returns table (submission_id uuid, collided boolean)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_submission_id uuid;
  v_collided boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_series_name is null or length(trim(p_series_name)) = 0 then
    raise exception 'series name is required';
  end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item is required';
  end if;

  select id into v_submission_id
  from public.list_submissions
  where submitted_by = auth.uid()
    and school_id = p_school_id
    and education_level = p_education_level
    and series_name = trim(p_series_name)
    and school_year = p_school_year
    and status in ('DRAFT', 'NEEDS_CORRECTION')
  limit 1;

  if v_submission_id is not null then
    v_collided := true;
    -- Alias explícito -- sem ele, "submission_id" fica ambíguo com a
    -- variável de saída do RETURNS TABLE acima.
    delete from public.submission_items si where si.submission_id = v_submission_id;
  else
    insert into public.list_submissions (school_id, submitted_by, education_level, series_name, school_year)
    values (p_school_id, auth.uid(), p_education_level, trim(p_series_name), p_school_year)
    returning id into v_submission_id;
  end if;

  insert into public.submission_items (submission_id, name, quantity, unit, brand, is_required, sort_order)
  select
    v_submission_id,
    trim(elem->>'name'),
    coalesce((elem->>'quantity')::int, 1),
    nullif(elem->>'unit', ''),
    nullif(elem->>'brand', ''),
    coalesce((elem->>'is_required')::boolean, true),
    (ord - 1)::int
  from jsonb_array_elements(p_items) with ordinality as t(elem, ord);

  return query select v_submission_id, v_collided;
end;
$$;
