-- RLS: school_lists/versions/items (public-read only, zero direct
-- authenticated-write policies -- see migration lists_contributions) and
-- list_submissions/submission_items/submission_attachments (private,
-- ownership-scoped, editable only while DRAFT/NEEDS_CORRECTION).

alter table public.school_lists enable row level security;
alter table public.school_list_versions enable row level security;
alter table public.school_list_items enable row level security;
alter table public.list_submissions enable row level security;
alter table public.submission_items enable row level security;
alter table public.submission_attachments enable row level security;

-- school_lists / versions / items: public read only. No insert/update
-- policy exists for `authenticated` at all -- not even school managers.
-- The only write path is approve_submission() (SECURITY DEFINER, admin
-- only). Admin keeps full access for corrections/archiving.
create policy "school_lists_select_approved" on public.school_lists
  for select to public
  using (status = 'APPROVED');

create policy "school_lists_admin_all" on public.school_lists
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "school_list_versions_select_published" on public.school_list_versions
  for select to public
  using (status = 'PUBLISHED');

create policy "school_list_versions_admin_all" on public.school_list_versions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "school_list_items_select_published" on public.school_list_items
  for select to public
  using (
    exists (
      select 1 from public.school_list_versions v
      where v.id = school_list_version_id and v.status = 'PUBLISHED'
    )
  );

create policy "school_list_items_admin_all" on public.school_list_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- list_submissions: never public; owner sees/creates their own; owner can
-- only update/delete while still editable (DRAFT or NEEDS_CORRECTION --
-- once SUBMITTED it's in the moderation queue and must not be touched by
-- the author). Owner can never set status past what the wizard allows --
-- the WITH CHECK still restricts to their own row, and only
-- approve_submission()/reject/request_correction (SECURITY DEFINER,
-- admin-gated) can move a submission through UNDER_REVIEW/APPROVED/
-- REJECTED, since the RLS UPDATE policy alone doesn't constrain which
-- status the user could try to set -- that check lives in the trigger
-- below.
create policy "list_submissions_select_own" on public.list_submissions
  for select to authenticated
  using (submitted_by = auth.uid());

create policy "list_submissions_insert_own" on public.list_submissions
  for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'DRAFT');

create policy "list_submissions_update_own_editable" on public.list_submissions
  for update to authenticated
  using (submitted_by = auth.uid() and status in ('DRAFT', 'NEEDS_CORRECTION'))
  with check (submitted_by = auth.uid());

create policy "list_submissions_delete_own_draft" on public.list_submissions
  for delete to authenticated
  using (submitted_by = auth.uid() and status = 'DRAFT');

create policy "list_submissions_admin_all" on public.list_submissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A regular user's own UPDATE policy would otherwise let them set status
-- to APPROVED/REJECTED/UNDER_REVIEW themselves (RLS alone can't express
-- "only admins may set this specific value"). This trigger closes that
-- gap: non-admins may only move DRAFT->SUBMITTED or
-- NEEDS_CORRECTION->SUBMITTED; every other transition requires
-- is_admin() (used by the moderation functions, which run as the calling
-- admin).
create or replace function public.guard_submission_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status in ('DRAFT', 'NEEDS_CORRECTION') and new.status = 'SUBMITTED' then
    return new;
  end if;

  raise exception 'only admins may change submission status from % to %', old.status, new.status;
end;
$$;

create trigger guard_list_submissions_status
  before update on public.list_submissions
  for each row execute function public.guard_submission_status_transition();

-- submission_items / submission_attachments: scoped through the parent
-- submission's ownership and editable state.
create policy "submission_items_select_own" on public.submission_items
  for select to authenticated
  using (
    exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid()
    )
  );

create policy "submission_items_write_own_editable" on public.submission_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid() and s.status in ('DRAFT', 'NEEDS_CORRECTION')
    )
  );

create policy "submission_items_update_own_editable" on public.submission_items
  for update to authenticated
  using (
    exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid() and s.status in ('DRAFT', 'NEEDS_CORRECTION')
    )
  )
  with check (
    exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid() and s.status in ('DRAFT', 'NEEDS_CORRECTION')
    )
  );

create policy "submission_items_delete_own_editable" on public.submission_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid() and s.status in ('DRAFT', 'NEEDS_CORRECTION')
    )
  );

create policy "submission_items_admin_all" on public.submission_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "submission_attachments_select_own" on public.submission_attachments
  for select to authenticated
  using (
    exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid()
    )
  );

create policy "submission_attachments_insert_own_editable" on public.submission_attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid() and s.status in ('DRAFT', 'NEEDS_CORRECTION')
    )
  );

create policy "submission_attachments_delete_own_editable" on public.submission_attachments
  for delete to authenticated
  using (
    exists (
      select 1 from public.list_submissions s
      where s.id = submission_id and s.submitted_by = auth.uid() and s.status in ('DRAFT', 'NEEDS_CORRECTION')
    )
  );

create policy "submission_attachments_admin_all" on public.submission_attachments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
