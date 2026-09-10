-- RLS: profiles + schools domain (schools, school_profiles, school_contacts,
-- school_images, school_education_levels, school_series, school_managers,
-- school_suggestions). Matches docs/security/rls.md.

alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.school_profiles enable row level security;
alter table public.school_contacts enable row level security;
alter table public.school_images enable row level security;
alter table public.school_education_levels enable row level security;
alter table public.school_series enable row level security;
alter table public.school_managers enable row level security;
alter table public.school_suggestions enable row level security;

-- profiles: anon none; own row only for authenticated; role can never be
-- changed by the user themself (the WITH CHECK re-reads the currently
-- stored role, so an UPDATE that changes it fails) -- rls.md test #4.
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- schools: public read of active rows; writes are admin-only (RN-005 --
-- ordinary users never edit INEP data directly, they submit/suggest).
create policy "schools_select_active" on public.schools
  for select to public
  using (is_active);

create policy "schools_admin_all" on public.schools
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- school_profiles / school_contacts / school_images / education levels /
-- series: public read tied to the parent school being active (school_images
-- additionally requires is_approved); writes by the school's manager or
-- admin.
create policy "school_profiles_select_active" on public.school_profiles
  for select to public
  using (exists (select 1 from public.schools s where s.id = school_id and s.is_active));

create policy "school_profiles_manager_write" on public.school_profiles
  for insert to authenticated
  with check (public.is_school_manager(school_id));

create policy "school_profiles_manager_update" on public.school_profiles
  for update to authenticated
  using (public.is_school_manager(school_id))
  with check (public.is_school_manager(school_id));

create policy "school_profiles_admin_all" on public.school_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "school_contacts_select_public" on public.school_contacts
  for select to public
  using (
    is_public
    and exists (select 1 from public.schools s where s.id = school_id and s.is_active)
  );

create policy "school_contacts_manager_write" on public.school_contacts
  for insert to authenticated
  with check (public.is_school_manager(school_id));

create policy "school_contacts_manager_update" on public.school_contacts
  for update to authenticated
  using (public.is_school_manager(school_id))
  with check (public.is_school_manager(school_id));

create policy "school_contacts_admin_all" on public.school_contacts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "school_images_select_approved" on public.school_images
  for select to public
  using (
    is_approved
    and exists (select 1 from public.schools s where s.id = school_id and s.is_active)
  );

create policy "school_images_manager_write" on public.school_images
  for insert to authenticated
  with check (public.is_school_manager(school_id));

create policy "school_images_manager_update" on public.school_images
  for update to authenticated
  using (public.is_school_manager(school_id))
  with check (public.is_school_manager(school_id));

create policy "school_images_admin_all" on public.school_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "school_education_levels_select_active" on public.school_education_levels
  for select to public
  using (exists (select 1 from public.schools s where s.id = school_id and s.is_active));

create policy "school_education_levels_manager_write" on public.school_education_levels
  for insert to authenticated
  with check (public.is_school_manager(school_id));

create policy "school_education_levels_admin_all" on public.school_education_levels
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "school_series_select_active" on public.school_series
  for select to public
  using (exists (select 1 from public.schools s where s.id = school_id and s.is_active));

create policy "school_series_manager_write" on public.school_series
  for insert to authenticated
  with check (public.is_school_manager(school_id));

create policy "school_series_admin_all" on public.school_series
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- school_managers: not publicly readable; a manager can see their own
-- membership rows (so the app can tell them which schools they manage),
-- but never write here directly -- only admin assigns managers.
create policy "school_managers_select_own" on public.school_managers
  for select to authenticated
  using (profile_id = auth.uid());

create policy "school_managers_admin_all" on public.school_managers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- school_suggestions (PRD RF-008): private to the submitter until reviewed.
create policy "school_suggestions_select_own" on public.school_suggestions
  for select to authenticated
  using (suggested_by = auth.uid());

create policy "school_suggestions_insert_own" on public.school_suggestions
  for insert to authenticated
  with check (suggested_by = auth.uid());

create policy "school_suggestions_admin_all" on public.school_suggestions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
