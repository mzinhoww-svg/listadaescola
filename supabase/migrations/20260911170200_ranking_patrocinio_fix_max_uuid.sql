-- Follow-up to 20260911170000_ranking_patrocinio.sql, caught by running
-- the real form end-to-end (Playwright) rather than trusting it compiled.
--
-- `select count(*), max(id) into ... from public.schools where name ilike
-- ...` fails at call time with "function max(uuid) does not exist" --
-- PostgreSQL never shipped a built-in MAX()/MIN() aggregate for uuid
-- (it has comparison operators for btree indexing, but no aggregate
-- registered on top of them, unlike most other comparable types). Fixed
-- by splitting into two statements: count first (and validate), then a
-- plain `limit 1` select for the id once exactly one match is confirmed
-- -- no aggregate needed at all.
create or replace function public.admin_create_campaign(
  p_entity_type text,
  p_entity_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_priority int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type public.campaign_entity_type := p_entity_type::public.campaign_entity_type;
  v_entity_id uuid;
  v_match_count int;
  v_campaign_id uuid;
begin
  if not public.is_admin() then
    raise exception 'only admins may create campaigns';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'end date must be after start date';
  end if;
  if p_priority < 0 then
    raise exception 'priority cannot be negative';
  end if;

  if v_entity_type = 'SCHOOL' then
    select count(*) into v_match_count from public.schools where name ilike btrim(p_entity_name);
  else
    select count(*) into v_match_count from public.stores where name ilike btrim(p_entity_name);
  end if;

  if v_match_count = 0 then
    raise exception 'no % found matching "%"', lower(v_entity_type::text), p_entity_name;
  elsif v_match_count > 1 then
    raise exception '% matches for "%" -- use the exact name', v_match_count, p_entity_name;
  end if;

  if v_entity_type = 'SCHOOL' then
    select id into v_entity_id from public.schools where name ilike btrim(p_entity_name) limit 1;
  else
    select id into v_entity_id from public.stores where name ilike btrim(p_entity_name) limit 1;
  end if;

  insert into public.campaigns (entity_type, entity_id, starts_at, ends_at, priority, status, created_by)
  values (v_entity_type, v_entity_id, p_starts_at, p_ends_at, p_priority, 'SCHEDULED', auth.uid())
  returning id into v_campaign_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'ADMIN_CREATE_CAMPAIGN', 'campaigns', v_campaign_id, null,
    jsonb_build_object('entity_type', v_entity_type, 'entity_id', v_entity_id, 'priority', p_priority)
  );

  return v_campaign_id;
end;
$$;
