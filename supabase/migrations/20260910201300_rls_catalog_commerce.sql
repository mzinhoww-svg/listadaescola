-- RLS: catalog / commerce (products, ecommerce_partners, ecommerce_products,
-- list_product_mappings). Public read of active/published data, admin-only
-- writes -- this is catalog metadata, not a user-writable domain.

alter table public.products enable row level security;
alter table public.ecommerce_partners enable row level security;
alter table public.ecommerce_products enable row level security;
alter table public.list_product_mappings enable row level security;

create policy "products_select_all" on public.products
  for select to public
  using (true);

create policy "products_admin_all" on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ecommerce_partners_select_active" on public.ecommerce_partners
  for select to public
  using (is_active);

create policy "ecommerce_partners_admin_all" on public.ecommerce_partners
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ecommerce_products_select_active" on public.ecommerce_products
  for select to public
  using (
    is_active
    and exists (select 1 from public.ecommerce_partners p where p.id = partner_id and p.is_active)
  );

create policy "ecommerce_products_admin_all" on public.ecommerce_products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "list_product_mappings_select_published" on public.list_product_mappings
  for select to public
  using (
    exists (
      select 1 from public.school_list_items i
      join public.school_list_versions v on v.id = i.school_list_version_id
      where i.id = school_list_item_id and v.status = 'PUBLISHED'
    )
  );

create policy "list_product_mappings_admin_all" on public.list_product_mappings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
