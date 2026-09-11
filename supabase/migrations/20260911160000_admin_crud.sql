-- Prompt 12 (admin CRUD): schools/lists/papelarias/e-commerce/catalog
-- admin mutations, plus the school_suggestions moderation explicitly
-- deferred from Prompt 11 (see docs/architecture/moderacao.md, "Fora do
-- escopo deste prompt").
--
-- Every table this migration's functions write to already grants admin
-- full CRUD via an existing "<table>_admin_all" RLS policy (schools,
-- school_profiles, stores, ecommerce_partners, products, ecommerce_products,
-- school_lists, school_suggestions) -- so no new RLS policy is needed here.
-- What's missing is: (1) audit-logged mutation entry points (audit_logs
-- itself has no insert policy for any client role -- only a SECURITY
-- DEFINER function, running as its owner, can write there -- see
-- audit_logs_admin_read in rls_campaigns_analytics_audit.sql), and (2) a
-- rejection-reason column for school_suggestions to mirror
-- list_submissions.rejection_reason.
--
-- Grants: learned from the Prompt 11 mistake (moderation_guards.sql then
-- moderation_guards_fix_public_grant.sql) -- `revoke ... from anon` alone
-- is a no-op when a role's only access is the implicit PUBLIC grant every
-- function gets at creation. Every admin-callable function below is
-- granted correctly from the start: `revoke ... from public` + explicit
-- `grant ... to authenticated`.

-- school_suggestions needs its own rejection-reason column, distinct from
-- the submitter-authored `notes` field -- mirrors list_submissions'
-- rejection_reason/correction_notes split (PRD RF-009-style audit trail,
-- applied here per moderacao.md's deferral of this exact feature).
alter table public.school_suggestions add column rejection_reason text;

-- First real query filtering school_suggestions by status (the moderation
-- queue) -- same pattern as list_submissions_status_idx/reviews_status_idx.
create index school_suggestions_status_idx on public.school_suggestions (status);

-- Internal helper only -- never granted to any client role (see grants at
-- the bottom). Callers are SECURITY DEFINER admin functions, which run as
-- their owner regardless of grants on functions they call internally.
-- p_table is only ever passed as a hardcoded literal from this file's own
-- functions, never client input, so dynamic SQL here is safe.
create or replace function public.unique_slug(p_base text, p_table text, p_exclude_id uuid default null)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_base text := public.slugify(p_base);
  v_candidate text;
  v_suffix int := 1;
  v_exists boolean;
begin
  if v_base = '' then
    v_base := 'item';
  end if;
  v_candidate := v_base;
  loop
    execute format('select exists (select 1 from public.%I where slug = $1 and ($2 is null or id <> $2))', p_table)
      into v_exists using v_candidate, p_exclude_id;
    exit when not v_exists;
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
  end loop;
  return v_candidate;
end;
$$;

revoke execute on function public.unique_slug(text, text, uuid) from public;

-- Escolas: edit editorial fields (school_profiles), verificar (is_verified),
-- ativar/inativar (schools.is_active). INEP-controlled columns on `schools`
-- itself (name, address, etc.) are deliberately NOT parameters here --
-- only the importer touches those (RN-002); admin never overwrites master
-- data through this function, only the editorial overlay + active flag.
create or replace function public.admin_update_school(
  p_school_id uuid,
  p_is_active boolean,
  p_description text,
  p_logo_url text,
  p_website text,
  p_instagram text,
  p_whatsapp text,
  p_is_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school public.schools;
  v_profile_before public.school_profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins may update schools';
  end if;

  select * into v_school from public.schools where id = p_school_id for update;
  if v_school is null then
    raise exception 'school % not found', p_school_id;
  end if;

  select * into v_profile_before from public.school_profiles where school_id = p_school_id;

  update public.schools set is_active = p_is_active where id = p_school_id;

  insert into public.school_profiles (school_id, description, logo_url, website, instagram, whatsapp, is_verified, updated_by)
  values (
    p_school_id, nullif(trim(p_description), ''), nullif(trim(p_logo_url), ''),
    nullif(trim(p_website), ''), nullif(trim(p_instagram), ''), nullif(trim(p_whatsapp), ''),
    p_is_verified, auth.uid()
  )
  on conflict (school_id) do update set
    description = excluded.description,
    logo_url = excluded.logo_url,
    website = excluded.website,
    instagram = excluded.instagram,
    whatsapp = excluded.whatsapp,
    is_verified = excluded.is_verified,
    updated_by = auth.uid();

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'ADMIN_UPDATE_SCHOOL', 'schools', p_school_id,
    jsonb_build_object('school', to_jsonb(v_school), 'profile', to_jsonb(v_profile_before)),
    jsonb_build_object(
      'is_active', p_is_active, 'description', p_description, 'logo_url', p_logo_url,
      'website', p_website, 'instagram', p_instagram, 'whatsapp', p_whatsapp, 'is_verified', p_is_verified
    )
  );
end;
$$;

-- Papelarias: create/edit. No manager-facing INSERT exists (RLS confirms
-- only admin creates stores) so this is the only creation path.
create or replace function public.admin_upsert_store(
  p_store_id uuid,
  p_name text,
  p_uf text,
  p_municipality text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_whatsapp text,
  p_opening_hours text,
  p_offers_delivery boolean,
  p_offers_pickup boolean,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stores;
  v_id uuid;
  v_slug text;
  v_name text := trim(p_name);
  v_uf text := trim(p_uf);
  v_municipality text := trim(p_municipality);
  v_whatsapp text := trim(p_whatsapp);
begin
  if not public.is_admin() then
    raise exception 'only admins may manage stores';
  end if;
  if v_name = '' then raise exception 'store name is required'; end if;
  if v_uf = '' then raise exception 'uf is required'; end if;
  if v_municipality = '' then raise exception 'municipality is required'; end if;
  if v_whatsapp = '' then raise exception 'whatsapp is required'; end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then
    raise exception 'latitude out of range';
  end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then
    raise exception 'longitude out of range';
  end if;

  if p_store_id is not null then
    select * into v_before from public.stores where id = p_store_id for update;
    if v_before is null then
      raise exception 'store % not found', p_store_id;
    end if;

    update public.stores set
      name = v_name, uf = v_uf, municipality = v_municipality, address = nullif(trim(p_address), ''),
      latitude = p_latitude, longitude = p_longitude, whatsapp = v_whatsapp,
      opening_hours = nullif(trim(p_opening_hours), ''), offers_delivery = p_offers_delivery,
      offers_pickup = p_offers_pickup, is_active = p_is_active
    where id = p_store_id;

    v_id := p_store_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(), 'ADMIN_UPDATE_STORE', 'stores', v_id, to_jsonb(v_before),
      jsonb_build_object('name', v_name, 'is_active', p_is_active)
    );
  else
    v_slug := public.unique_slug(v_name, 'stores');

    insert into public.stores (
      name, slug, uf, municipality, address, latitude, longitude, whatsapp,
      opening_hours, offers_delivery, offers_pickup, is_active
    )
    values (
      v_name, v_slug, v_uf, v_municipality, nullif(trim(p_address), ''), p_latitude, p_longitude, v_whatsapp,
      nullif(trim(p_opening_hours), ''), p_offers_delivery, p_offers_pickup, p_is_active
    )
    returning id into v_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'ADMIN_CREATE_STORE', 'stores', v_id, null, jsonb_build_object('name', v_name, 'slug', v_slug));
  end if;

  return v_id;
end;
$$;

-- E-commerce: parceiros.
create or replace function public.admin_upsert_ecommerce_partner(
  p_partner_id uuid,
  p_name text,
  p_logo_url text,
  p_website text,
  p_integration_type text,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.ecommerce_partners;
  v_id uuid;
  v_slug text;
  v_name text := trim(p_name);
  v_website text := trim(p_website);
  v_integration public.ecommerce_integration_type := p_integration_type::public.ecommerce_integration_type;
begin
  if not public.is_admin() then
    raise exception 'only admins may manage ecommerce partners';
  end if;
  if v_name = '' then raise exception 'partner name is required'; end if;
  if v_website = '' then raise exception 'website is required'; end if;

  if p_partner_id is not null then
    select * into v_before from public.ecommerce_partners where id = p_partner_id for update;
    if v_before is null then
      raise exception 'ecommerce partner % not found', p_partner_id;
    end if;

    update public.ecommerce_partners set
      name = v_name, logo_url = nullif(trim(p_logo_url), ''), website = v_website,
      integration_type = v_integration, is_active = p_is_active
    where id = p_partner_id;

    v_id := p_partner_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(), 'ADMIN_UPDATE_ECOMMERCE_PARTNER', 'ecommerce_partners', v_id, to_jsonb(v_before),
      jsonb_build_object('name', v_name, 'is_active', p_is_active)
    );
  else
    v_slug := public.unique_slug(v_name, 'ecommerce_partners');

    insert into public.ecommerce_partners (name, slug, logo_url, website, integration_type, is_active)
    values (v_name, v_slug, nullif(trim(p_logo_url), ''), v_website, v_integration, p_is_active)
    returning id into v_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'ADMIN_CREATE_ECOMMERCE_PARTNER', 'ecommerce_partners', v_id, null, jsonb_build_object('name', v_name, 'slug', v_slug));
  end if;

  return v_id;
end;
$$;

-- Catálogo: produtos (marca/categoria are free-text columns on the
-- product itself -- no separate brand/category tables exist to CRUD).
create or replace function public.admin_upsert_product(
  p_product_id uuid,
  p_name text,
  p_brand text,
  p_category text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.products;
  v_id uuid;
  v_name text := trim(p_name);
begin
  if not public.is_admin() then
    raise exception 'only admins may manage products';
  end if;
  if v_name = '' then raise exception 'product name is required'; end if;

  if p_product_id is not null then
    select * into v_before from public.products where id = p_product_id for update;
    if v_before is null then
      raise exception 'product % not found', p_product_id;
    end if;

    update public.products set name = v_name, brand = nullif(trim(p_brand), ''), category = nullif(trim(p_category), '')
    where id = p_product_id;

    v_id := p_product_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'ADMIN_UPDATE_PRODUCT', 'products', v_id, to_jsonb(v_before), jsonb_build_object('name', v_name));
  else
    insert into public.products (name, brand, category)
    values (v_name, nullif(trim(p_brand), ''), nullif(trim(p_category), ''))
    returning id into v_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'ADMIN_CREATE_PRODUCT', 'products', v_id, null, jsonb_build_object('name', v_name));
  end if;

  return v_id;
end;
$$;

-- Catálogo: mapeamentos de parceiros (a partner's outbound offer for a
-- product -- the row list_product_mappings/PartnerOfferButton point at).
create or replace function public.admin_upsert_ecommerce_product(
  p_ecommerce_product_id uuid,
  p_partner_id uuid,
  p_product_id uuid,
  p_external_url text,
  p_price_hint numeric,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.ecommerce_products;
  v_id uuid;
  v_external_url text := trim(p_external_url);
begin
  if not public.is_admin() then
    raise exception 'only admins may manage ecommerce product offers';
  end if;
  if p_partner_id is null then raise exception 'partner is required'; end if;
  if p_product_id is null then raise exception 'product is required'; end if;
  if v_external_url = '' then raise exception 'external url is required'; end if;
  if p_price_hint is not null and p_price_hint < 0 then raise exception 'price hint cannot be negative'; end if;

  if p_ecommerce_product_id is not null then
    select * into v_before from public.ecommerce_products where id = p_ecommerce_product_id for update;
    if v_before is null then
      raise exception 'ecommerce product % not found', p_ecommerce_product_id;
    end if;

    update public.ecommerce_products set
      partner_id = p_partner_id, product_id = p_product_id, external_url = v_external_url,
      price_hint = p_price_hint, is_active = p_is_active
    where id = p_ecommerce_product_id;

    v_id := p_ecommerce_product_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(), 'ADMIN_UPDATE_ECOMMERCE_PRODUCT', 'ecommerce_products', v_id, to_jsonb(v_before),
      jsonb_build_object('external_url', v_external_url, 'is_active', p_is_active)
    );
  else
    insert into public.ecommerce_products (partner_id, product_id, external_url, price_hint, is_active)
    values (p_partner_id, p_product_id, v_external_url, p_price_hint, p_is_active)
    returning id into v_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'ADMIN_CREATE_ECOMMERCE_PRODUCT', 'ecommerce_products', v_id, null, jsonb_build_object('external_url', v_external_url));
  end if;

  return v_id;
end;
$$;

-- Listas: "arquivar" a published list (RN-006: no hard delete, use
-- status) and reverse it. Deliberately NOT a general-purpose editor --
-- school_lists/versions/items still have exactly one write path for
-- content (approve_submission()); this only flips the list-level status
-- column, same shape as the existing CHECK constraint on school_lists.
create or replace function public.admin_set_school_list_status(p_school_list_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.school_lists;
begin
  if not public.is_admin() then
    raise exception 'only admins may change list status';
  end if;
  if p_status not in ('APPROVED', 'ARCHIVED') then
    raise exception 'invalid status %', p_status;
  end if;

  select * into v_before from public.school_lists where id = p_school_list_id for update;
  if v_before is null then
    raise exception 'school list % not found', p_school_list_id;
  end if;

  update public.school_lists set status = p_status where id = p_school_list_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'ADMIN_SET_LIST_STATUS', 'school_lists', p_school_list_id, to_jsonb(v_before), jsonb_build_object('status', p_status));
end;
$$;

-- Moderação de school_suggestions (explicitly deferred from Prompt 11 to
-- "Prompt 12 (Admin CRUD)" -- see docs/architecture/moderacao.md). Same
-- shape as approve_submission/reject_submission, including the
-- self-review guard learned from that prompt -- less likely to be
-- exploitable here (a suggestion has no content an author could rubber
-- stamp), but it is the same conflict-of-interest pattern, so the guard
-- is applied for consistency rather than re-litigated.
--
-- Approving only marks the suggestion reviewed -- it does NOT create a
-- `schools` row. schools.inep_code is NOT NULL/unique and every column up
-- to cep_source is INEP-controlled (see schools.sql); a community
-- suggestion has no INEP code, so there is no schema-honest way to
-- auto-promote it into `schools` here. Turning an approved suggestion
-- into a real school row stays the manual, out-of-band step the original
-- Prompt 02 comment already describes ("an admin does that manually").
create or replace function public.approve_school_suggestion(p_suggestion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.school_suggestions;
begin
  if not public.is_admin() then
    raise exception 'only admins may approve school suggestions';
  end if;

  select * into v_before from public.school_suggestions where id = p_suggestion_id for update;
  if v_before is null then
    raise exception 'school suggestion % not found', p_suggestion_id;
  end if;
  if v_before.suggested_by = auth.uid() then
    raise exception 'you cannot review your own suggestion';
  end if;
  if v_before.status <> 'SUBMITTED' then
    raise exception 'suggestion % is not awaiting review (status=%)', p_suggestion_id, v_before.status;
  end if;

  update public.school_suggestions
  set status = 'APPROVED', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_suggestion_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'APPROVE_SCHOOL_SUGGESTION', 'school_suggestions', p_suggestion_id, to_jsonb(v_before), jsonb_build_object('status', 'APPROVED'));
end;
$$;

create or replace function public.reject_school_suggestion(p_suggestion_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.school_suggestions;
begin
  if not public.is_admin() then
    raise exception 'only admins may reject school suggestions';
  end if;

  select * into v_before from public.school_suggestions where id = p_suggestion_id for update;
  if v_before is null then
    raise exception 'school suggestion % not found', p_suggestion_id;
  end if;
  if v_before.suggested_by = auth.uid() then
    raise exception 'you cannot review your own suggestion';
  end if;
  if v_before.status <> 'SUBMITTED' then
    raise exception 'suggestion % is not awaiting review (status=%)', p_suggestion_id, v_before.status;
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'a rejection reason is required';
  end if;

  update public.school_suggestions
  set status = 'REJECTED', rejection_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_suggestion_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'REJECT_SCHOOL_SUGGESTION', 'school_suggestions', p_suggestion_id, to_jsonb(v_before),
    jsonb_build_object('status', 'REJECTED', 'rejection_reason', p_reason)
  );
end;
$$;

-- Grants: correct from the start (revoke the implicit PUBLIC grant, then
-- an explicit grant to authenticated) -- see the Prompt 11 postmortem at
-- the top of this file for why `revoke ... from anon` alone would be a
-- no-op. unique_slug is intentionally excluded -- internal-only.
revoke execute on function public.admin_update_school(uuid, boolean, text, text, text, text, text, boolean) from public;
revoke execute on function public.admin_upsert_store(uuid, text, text, text, text, double precision, double precision, text, text, boolean, boolean, boolean) from public;
revoke execute on function public.admin_upsert_ecommerce_partner(uuid, text, text, text, text, boolean) from public;
revoke execute on function public.admin_upsert_product(uuid, text, text, text) from public;
revoke execute on function public.admin_upsert_ecommerce_product(uuid, uuid, uuid, text, numeric, boolean) from public;
revoke execute on function public.admin_set_school_list_status(uuid, text) from public;
revoke execute on function public.approve_school_suggestion(uuid) from public;
revoke execute on function public.reject_school_suggestion(uuid, text) from public;

grant execute on function public.admin_update_school(uuid, boolean, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_upsert_store(uuid, text, text, text, text, double precision, double precision, text, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.admin_upsert_ecommerce_partner(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_upsert_product(uuid, text, text, text) to authenticated;
grant execute on function public.admin_upsert_ecommerce_product(uuid, uuid, uuid, text, numeric, boolean) to authenticated;
grant execute on function public.admin_set_school_list_status(uuid, text) to authenticated;
grant execute on function public.approve_school_suggestion(uuid) to authenticated;
grant execute on function public.reject_school_suggestion(uuid, text) to authenticated;
