-- RLS: stores domain -- mirrors the schools domain pattern exactly.

alter table public.stores enable row level security;
alter table public.store_contacts enable row level security;
alter table public.store_services enable row level security;
alter table public.store_managers enable row level security;

create policy "stores_select_active" on public.stores
  for select to public
  using (is_active);

create policy "stores_manager_update" on public.stores
  for update to authenticated
  using (public.is_store_manager(id))
  with check (public.is_store_manager(id));

create policy "stores_admin_all" on public.stores
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "store_contacts_select_public" on public.store_contacts
  for select to public
  using (
    is_public
    and exists (select 1 from public.stores s where s.id = store_id and s.is_active)
  );

create policy "store_contacts_manager_write" on public.store_contacts
  for insert to authenticated
  with check (public.is_store_manager(store_id));

create policy "store_contacts_manager_update" on public.store_contacts
  for update to authenticated
  using (public.is_store_manager(store_id))
  with check (public.is_store_manager(store_id));

create policy "store_contacts_admin_all" on public.store_contacts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "store_services_select_active" on public.store_services
  for select to public
  using (exists (select 1 from public.stores s where s.id = store_id and s.is_active));

create policy "store_services_manager_write" on public.store_services
  for insert to authenticated
  with check (public.is_store_manager(store_id));

create policy "store_services_manager_delete" on public.store_services
  for delete to authenticated
  using (public.is_store_manager(store_id));

create policy "store_services_admin_all" on public.store_services
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "store_managers_select_own" on public.store_managers
  for select to authenticated
  using (profile_id = auth.uid());

create policy "store_managers_admin_all" on public.store_managers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
