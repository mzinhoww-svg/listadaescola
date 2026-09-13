-- Roadmap Tier 2 (docs/product/roadmap-icps-2026-09.md, sub-projeto
-- papelaria #1): CTA na home + rascunho anônimo do wizard de contribuição.
-- Spec completa em docs/superpowers/specs/2026-09-13-cta-home-rascunho-anonimo-design.md.

-- Mesma assinatura de record_analytics_event -- create or replace basta,
-- sem drop (só a lista de valores aceitos muda).
create or replace function public.record_analytics_event(
  p_event_type text,
  p_school_id uuid default null,
  p_store_id uuid default null,
  p_list_id uuid default null,
  p_partner_id uuid default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if p_event_type not in (
    'location_search', 'location_detected', 'school_search', 'school_impression',
    'school_view', 'list_view', 'list_share', 'commerce_click', 'whatsapp_click',
    'store_view', 'favorite_added', 'review_created', 'submission_started',
    'submission_submitted', 'submission_approved', 'home_list_request_click'
  ) then
    raise exception 'invalid event_type: %', p_event_type;
  end if;

  insert into public.analytics_events (
    event_type, profile_id, school_id, store_id, list_id, partner_id, session_id, metadata
  )
  values (
    p_event_type, auth.uid(), p_school_id, p_store_id, p_list_id, p_partner_id,
    p_session_id, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$function$;

-- Materializa um rascunho de envio guardado no localStorage do visitante
-- anônimo (escola + etapa/série/ano + itens) assim que ele autentica.
-- SECURITY INVOKER (padrão, sem "security definer"): roda como o próprio
-- usuário autenticado, respeitando list_submissions_insert_own /
-- submission_items_write_own_editable exatamente como startSubmissionAction
-- e addSubmissionItemAction já fazem hoje via chamadas diretas -- esta
-- função só existe para tornar find-or-create-submissão + substituir itens
-- **uma transação**, não duas chamadas separadas (uma função plpgsql é
-- sempre atômica dentro de si mesma; se o insert de itens falhar, o
-- find-or-create acima também desfaz).
create function public.materialize_local_draft(
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

  -- Mesma tupla de find-or-create que startSubmissionAction já usa --
  -- reaproveita um DRAFT/NEEDS_CORRECTION em andamento em vez de duplicar.
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
    delete from public.submission_items where submission_id = v_submission_id;
  else
    insert into public.list_submissions (school_id, submitted_by, education_level, series_name, school_year)
    values (p_school_id, auth.uid(), p_education_level, trim(p_series_name), p_school_year)
    returning id into v_submission_id;
  end if;

  -- Itens já validados em materializeLocalDraftAction (mesma disciplina de
  -- addSubmissionItemAction: DB só garante not null / quantity > 0, o
  -- resto -- tamanho de nome, faixa de quantidade -- é responsabilidade da
  -- Server Action, não desta função).
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

comment on function public.materialize_local_draft(uuid, text, text, int, jsonb) is
  'Materializa em list_submissions/submission_items um rascunho anônimo guardado em localStorage, no momento em que o visitante autentica. SECURITY INVOKER -- respeita as mesmas RLS de sempre, não é um bypass.';

revoke all on function public.materialize_local_draft(uuid, text, text, int, jsonb) from public;
grant execute on function public.materialize_local_draft(uuid, text, text, int, jsonb) to authenticated;
