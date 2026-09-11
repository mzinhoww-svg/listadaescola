-- Prompt 14 (analytics-vendas): commercial reporting tables the analytics
-- domain was always meant to grow into -- see
-- 20260910200800_analytics_audit.sql's own comment: "Prompt 14 extends
-- analytics_events with the commercial reporting tables (sales,
-- commissions)". Two channels, two shapes (papelaria has a
-- solicitação->orçamento->venda lifecycle with a status; e-commerce is a
-- flat reported-conversion log), so two tables rather than one polymorphic
-- one -- unlike `campaigns`, whose SCHOOL/STORE split is a single simple
-- concept (priority boost), these have genuinely different fields.
--
-- No orders/payments/checkout table anywhere here, per this prompt's own
-- absolute rule and the pre-existing one in catalog_commerce.sql -- these
-- are self-reported reconciliation records an admin enters after a
-- partner/papelaria reports a sale out of band (WhatsApp, email, phone).
-- Neither `ecommerce_partners` nor `stores` has any manager-facing
-- self-service account today (STORE_MANAGER is a real RBAC role with a
-- `store_managers` self-select RLS policy, but no route in the app has
-- ever checked it -- confirmed empirically, zero call sites) -- building
-- that portal is its own feature with no dedicated prompt in 00-20, so
-- out of scope here; admin-entered is the only channel that exists today,
-- same reasoning admin-crud.md already applied to papelaria/e-commerce
-- CRUD in Prompt 12.

create type public.store_sale_status as enum ('REQUESTED', 'QUOTED', 'CONVERTED', 'LOST');

-- Papelaria: solicitação = the existing whatsapp_click event (RF-011,
-- already tracked since Prompt 09) -- not duplicated here. This table
-- picks up from there: orçamento (QUOTED + quoted_value), venda reportada
-- (CONVERTED + sale_value). "Ticket" (ticket médio) and "conversão" are
-- both derived aggregates (avg/ratio), computed in the admin analytics
-- query layer, not stored columns -- same "never fabricate a redundant
-- stored number" principle already applied to distance/rating.
create table public.store_sale_reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  list_id uuid references public.school_lists (id) on delete set null,
  status public.store_sale_status not null default 'REQUESTED',
  quoted_value numeric(10, 2),
  sale_value numeric(10, 2),
  notes text,
  reported_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quoted_value is null or quoted_value >= 0),
  check (sale_value is null or sale_value >= 0),
  check (status <> 'CONVERTED' or sale_value is not null)
);

create index store_sale_reports_store_id_idx on public.store_sale_reports (store_id);
create index store_sale_reports_status_idx on public.store_sale_reports (status);

alter table public.store_sale_reports enable row level security;

create policy "store_sale_reports_admin_all" on public.store_sale_reports
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- E-commerce: cliques = the existing commerce_click event (Prompt 08),
-- not duplicated here. This table is "conversões reportadas, valor e
-- comissão" -- a flat log, one row per reported conversion.
create table public.partner_sale_reports (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.ecommerce_partners (id) on delete cascade,
  ecommerce_product_id uuid references public.ecommerce_products (id) on delete set null,
  school_id uuid references public.schools (id) on delete set null,
  list_id uuid references public.school_lists (id) on delete set null,
  gross_value numeric(10, 2) not null,
  commission_value numeric(10, 2) not null default 0,
  notes text,
  reported_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (gross_value > 0),
  check (commission_value >= 0 and commission_value <= gross_value)
);

create index partner_sale_reports_partner_id_idx on public.partner_sale_reports (partner_id);
create index partner_sale_reports_created_at_idx on public.partner_sale_reports (created_at desc);

alter table public.partner_sale_reports enable row level security;

create policy "partner_sale_reports_admin_all" on public.partner_sale_reports
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin mutation RPCs, same upsert-by-nullable-id shape as
-- admin_upsert_store/admin_upsert_ecommerce_product (Prompt 12): p_id null
-- = create, non-null = update. Audit-logged, is_admin()-gated,
-- SECURITY DEFINER (writes go through RLS-bypassing DEFINER exactly like
-- every other admin_* mutation in this codebase, for the same audit-log
-- atomicity reason documented in admin_crud.sql).
create or replace function public.admin_upsert_store_sale_report(
  p_id uuid,
  p_store_id uuid,
  p_school_id uuid,
  p_list_id uuid,
  p_status text,
  p_quoted_value numeric,
  p_sale_value numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.store_sale_reports;
  v_id uuid;
  v_status public.store_sale_status;
begin
  if not public.is_admin() then
    raise exception 'only admins may manage store sale reports';
  end if;
  if p_store_id is null or not exists (select 1 from public.stores where id = p_store_id) then
    raise exception 'store % not found', p_store_id;
  end if;

  begin
    v_status := p_status::public.store_sale_status;
  exception when invalid_text_representation then
    raise exception 'invalid status %', p_status;
  end;

  if p_quoted_value is not null and p_quoted_value < 0 then raise exception 'quoted value cannot be negative'; end if;
  if p_sale_value is not null and p_sale_value < 0 then raise exception 'sale value cannot be negative'; end if;
  if v_status = 'CONVERTED' and p_sale_value is null then
    raise exception 'sale value is required when status is CONVERTED';
  end if;

  if p_id is not null then
    select * into v_before from public.store_sale_reports where id = p_id for update;
    if v_before is null then
      raise exception 'store sale report % not found', p_id;
    end if;

    update public.store_sale_reports set
      store_id = p_store_id, school_id = p_school_id, list_id = p_list_id, status = v_status,
      quoted_value = p_quoted_value, sale_value = p_sale_value, notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_at = now()
    where id = p_id;

    v_id := p_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(), 'ADMIN_UPDATE_STORE_SALE_REPORT', 'store_sale_reports', v_id, to_jsonb(v_before),
      jsonb_build_object('status', v_status, 'quoted_value', p_quoted_value, 'sale_value', p_sale_value)
    );
  else
    insert into public.store_sale_reports (store_id, school_id, list_id, status, quoted_value, sale_value, notes, reported_by)
    values (
      p_store_id, p_school_id, p_list_id, v_status, p_quoted_value, p_sale_value,
      nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
    )
    returning id into v_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(), 'ADMIN_CREATE_STORE_SALE_REPORT', 'store_sale_reports', v_id, null,
      jsonb_build_object('store_id', p_store_id, 'status', v_status)
    );
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_upsert_partner_sale_report(
  p_id uuid,
  p_partner_id uuid,
  p_ecommerce_product_id uuid,
  p_school_id uuid,
  p_list_id uuid,
  p_gross_value numeric,
  p_commission_value numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.partner_sale_reports;
  v_id uuid;
  v_commission numeric := coalesce(p_commission_value, 0);
begin
  if not public.is_admin() then
    raise exception 'only admins may manage partner sale reports';
  end if;
  if p_partner_id is null or not exists (select 1 from public.ecommerce_partners where id = p_partner_id) then
    raise exception 'ecommerce partner % not found', p_partner_id;
  end if;
  if p_ecommerce_product_id is not null and not exists (
    select 1 from public.ecommerce_products where id = p_ecommerce_product_id and partner_id = p_partner_id
  ) then
    raise exception 'ecommerce product % does not belong to partner %', p_ecommerce_product_id, p_partner_id;
  end if;
  if p_gross_value is null or p_gross_value <= 0 then raise exception 'gross value must be positive'; end if;
  if v_commission < 0 or v_commission > p_gross_value then
    raise exception 'commission must be between 0 and the gross value';
  end if;

  if p_id is not null then
    select * into v_before from public.partner_sale_reports where id = p_id for update;
    if v_before is null then
      raise exception 'partner sale report % not found', p_id;
    end if;

    update public.partner_sale_reports set
      partner_id = p_partner_id, ecommerce_product_id = p_ecommerce_product_id, school_id = p_school_id,
      list_id = p_list_id, gross_value = p_gross_value, commission_value = v_commission,
      notes = nullif(trim(coalesce(p_notes, '')), '')
    where id = p_id;

    v_id := p_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(), 'ADMIN_UPDATE_PARTNER_SALE_REPORT', 'partner_sale_reports', v_id, to_jsonb(v_before),
      jsonb_build_object('gross_value', p_gross_value, 'commission_value', v_commission)
    );
  else
    insert into public.partner_sale_reports (
      partner_id, ecommerce_product_id, school_id, list_id, gross_value, commission_value, notes, reported_by
    )
    values (
      p_partner_id, p_ecommerce_product_id, p_school_id, p_list_id, p_gross_value, v_commission,
      nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
    )
    returning id into v_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(), 'ADMIN_CREATE_PARTNER_SALE_REPORT', 'partner_sale_reports', v_id, null,
      jsonb_build_object('partner_id', p_partner_id, 'gross_value', p_gross_value)
    );
  end if;

  return v_id;
end;
$$;

-- Read-only analytics aggregation. SECURITY INVOKER (not DEFINER, unlike
-- the mutation RPCs above) -- admin already has legitimate direct SELECT
-- on analytics_events via analytics_events_admin_read RLS, so there is no
-- RLS-bypass need here the way search_schools needed DEFINER for
-- campaigns (which has no public/authenticated SELECT policy at all).
-- Running as invoker means a non-admin caller is blocked twice over: the
-- is_admin() check below, and the RLS policy under it -- least privilege.
--
-- Every column reference below is qualified with its table alias (ae./s.)
-- specifically to avoid the RETURNS TABLE implicit-variable-shadowing trap
-- this codebase has already hit twice (search_schools, Prompt 06 and
-- Prompt 13) -- an unqualified `event_type` or `school_id` here would be
-- ambiguous against the implicit plpgsql variables the RETURNS TABLE
-- column list creates for this function's whole body.
create or replace function public.admin_analytics_event_counts(p_since timestamptz default now() - interval '30 days')
returns table (event_type text, event_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may read analytics';
  end if;

  return query
    select ae.event_type, count(*)::bigint
    from public.analytics_events ae
    where ae.created_at >= p_since
    group by ae.event_type;
end;
$$;

create or replace function public.admin_analytics_top_schools(
  p_since timestamptz default now() - interval '30 days',
  p_limit int default 10
)
returns table (school_id uuid, school_name text, view_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may read analytics';
  end if;
  if p_limit < 1 or p_limit > 50 then
    raise exception 'limit must be between 1 and 50';
  end if;

  return query
    select s.id, s.name, count(*)::bigint as view_count
    from public.analytics_events ae
    join public.schools s on s.id = ae.school_id
    where ae.created_at >= p_since and ae.event_type = 'school_view'
    group by s.id, s.name
    order by view_count desc, s.name asc
    limit p_limit;
end;
$$;

-- Grants: correct from the start, matching the pattern fixed into
-- admin_crud_fix_anon_grant.sql -- explicit `revoke ... from public` AND
-- `revoke ... from anon` (not relying solely on the now-forward-fixed
-- `alter default privileges` from that migration, verified empirically
-- after this one applies rather than assumed), then explicit
-- `grant ... to authenticated`.
revoke execute on function public.admin_upsert_store_sale_report(uuid, uuid, uuid, uuid, text, numeric, numeric, text) from public;
revoke execute on function public.admin_upsert_partner_sale_report(uuid, uuid, uuid, uuid, uuid, numeric, numeric, text) from public;
revoke execute on function public.admin_analytics_event_counts(timestamptz) from public;
revoke execute on function public.admin_analytics_top_schools(timestamptz, int) from public;

revoke execute on function public.admin_upsert_store_sale_report(uuid, uuid, uuid, uuid, text, numeric, numeric, text) from anon;
revoke execute on function public.admin_upsert_partner_sale_report(uuid, uuid, uuid, uuid, uuid, numeric, numeric, text) from anon;
revoke execute on function public.admin_analytics_event_counts(timestamptz) from anon;
revoke execute on function public.admin_analytics_top_schools(timestamptz, int) from anon;

grant execute on function public.admin_upsert_store_sale_report(uuid, uuid, uuid, uuid, text, numeric, numeric, text) to authenticated;
grant execute on function public.admin_upsert_partner_sale_report(uuid, uuid, uuid, uuid, uuid, numeric, numeric, text) to authenticated;
grant execute on function public.admin_analytics_event_counts(timestamptz) to authenticated;
grant execute on function public.admin_analytics_top_schools(timestamptz, int) to authenticated;
