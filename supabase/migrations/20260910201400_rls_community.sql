-- RLS: community (favorites, reviews, reports).

alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using (profile_id = auth.uid());

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using (profile_id = auth.uid());

create policy "favorites_admin_all" on public.favorites
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- reviews: public sees approved reviews; the author additionally sees
-- their own regardless of status (so they can see it's pending/rejected).
-- A user can never self-approve: insert/update are pinned to
-- status = 'PENDING' in the WITH CHECK, and editing is only allowed while
-- still PENDING (once moderated, the review is final for the author).
create policy "reviews_select_approved" on public.reviews
  for select to public
  using (status = 'APPROVED');

create policy "reviews_select_own" on public.reviews
  for select to authenticated
  using (profile_id = auth.uid());

create policy "reviews_insert_own_pending" on public.reviews
  for insert to authenticated
  with check (profile_id = auth.uid() and status = 'PENDING');

create policy "reviews_update_own_pending" on public.reviews
  for update to authenticated
  using (profile_id = auth.uid() and status = 'PENDING')
  with check (profile_id = auth.uid() and status = 'PENDING');

create policy "reviews_admin_all" on public.reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- reports: write-only for the reporter (never public, never editable once
-- filed -- moderation happens via the admin/status column, not by the
-- reporter). Reporters can see their own report history.
create policy "reports_select_own" on public.reports
  for select to authenticated
  using (reported_by = auth.uid());

create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (reported_by = auth.uid());

create policy "reports_admin_all" on public.reports
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
