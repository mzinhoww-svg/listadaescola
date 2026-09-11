-- Prompt 17 E2E fixtures. Run this once (via mcp__Supabase__execute_sql or
-- the Supabase SQL editor) before `npm run test:e2e`, and
-- e2e-cleanup.sql after. Not run by Playwright itself -- no service-role
-- key belongs in local env (docs/security/final-audit.md). See
-- docs/development/e2e-testing.md for the full runbook.
--
-- Deterministic: picks a real MT school (never fabricates one --
-- schools is INEP master data, CLAUDE.md) that has no existing
-- school_lists row, ordered by inep_code so re-running this later picks
-- the same one (INEP codes are permanent). Everything else is created
-- fresh, prefixed `e2e-p17-` so e2e-cleanup.sql can find it unambiguously.

-- auth.users insert needs an elevated role -- must run before any
-- `set local role authenticated` (none needed here, execute_sql already
-- runs elevated), same ordering lesson as every earlier prompt's test
-- fixtures.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'e2e-p17-user@example.com', extensions.crypt('E2ePr0mpt17!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"E2E User"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'e2e-p17-user-b@example.com', extensions.crypt('E2ePr0mpt17!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"E2E User B"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'e2e-p17-admin@example.com', extensions.crypt('E2ePr0mpt17!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"E2E Admin"}', now(), now(),
   '', '', '', '', '', '', '', '');

-- handle_new_user() already created a profiles row per user (default
-- role USER) -- UPDATE, never INSERT, or it collides on the PK.
update public.profiles set role = 'ADMIN'
where id = (select id from auth.users where email = 'e2e-p17-admin@example.com');

-- Real MT school, no existing list, deterministic pick.
with picked as (
  select s.id, s.slug, s.uf, s.municipality, s.name
  from public.schools s
  where s.is_active and s.uf = 'MT'
    and not exists (select 1 from public.school_lists sl where sl.school_id = s.id)
  order by s.inep_code
  limit 1
),
new_list as (
  insert into public.school_lists (school_id, education_level, series_name, school_year, slug, status)
  select id, 'Ensino Fundamental', '5º Ano', 2026, 'e2e-p17-lista-' || substr(id::text, 1, 8), 'APPROVED'
  from picked
  returning id, school_id
),
new_version as (
  insert into public.school_list_versions (school_list_id, version_number, status, published_at)
  select id, 1, 'PUBLISHED', now()
  from new_list
  returning id, school_list_id
),
new_items as (
  insert into public.school_list_items (school_list_version_id, name, quantity, unit, is_required, sort_order)
  select id, 'e2e-p17 Caderno brochura 96 folhas', 2, 'unidade', true, 1 from new_version
  union all
  select id, 'e2e-p17 Lápis de cor 12 cores', 1, 'caixa', false, 2 from new_version
  returning id, school_list_version_id, name
),
new_partner as (
  insert into public.ecommerce_partners (name, slug, website, integration_type, is_active)
  values ('E2E Prompt17 Partner', 'e2e-p17-partner', 'https://example.com', 'DEEP_LINK', true)
  returning id
),
new_product as (
  insert into public.products (name, brand, category)
  values ('e2e-p17 Caderno brochura 96 folhas', 'GenericBrand', 'Papelaria')
  returning id
),
new_ecommerce_product as (
  insert into public.ecommerce_products (partner_id, product_id, external_url, price_hint, is_active)
  select new_partner.id, new_product.id, 'https://example.com/produto/e2e-p17', 19.9, true
  from new_partner, new_product
  returning id
),
new_mapping as (
  insert into public.list_product_mappings (school_list_item_id, ecommerce_product_id)
  select new_items.id, new_ecommerce_product.id
  from new_items, new_ecommerce_product
  where new_items.name = 'e2e-p17 Caderno brochura 96 folhas'
  returning id
),
new_store as (
  insert into public.stores (name, slug, uf, municipality, address, whatsapp, opening_hours, offers_delivery, offers_pickup, is_active)
  select 'E2E Prompt17 Papelaria', 'e2e-p17-papelaria', picked.uf, picked.municipality, 'Rua Teste E2E, 100',
         '5565999990000', 'Seg-Sex 08h-18h', true, true, true
  from picked
  returning id
)
select
  (select id from picked) as school_id,
  (select slug from picked) as school_slug,
  (select uf from picked) as school_uf,
  (select municipality from picked) as school_municipality,
  (select name from picked) as school_name,
  (select id from new_list) as list_id,
  (select slug from public.school_lists where id = (select id from new_list)) as list_slug,
  (select id from new_store) as store_id,
  (select id from auth.users where email = 'e2e-p17-user@example.com') as user_id,
  (select id from auth.users where email = 'e2e-p17-user-b@example.com') as user_b_id,
  (select id from auth.users where email = 'e2e-p17-admin@example.com') as admin_id;
