-- Prompt 20 (final PRD gap analysis, docs/implementation/mvp-gap-analysis.md):
-- fixes for RN-006/RN-007 (hard-delete of master data), RF-014 (reviews
-- moderation), RF-016 (user role management), SEC-008 (basic auth rate
-- limiting).

-- ---------------------------------------------------------------------
-- RN-006/RN-007: schools/school_lists/school_list_versions/
-- school_list_items are master/versioned-history data that must never be
-- physically deleted (status/inativação instead). The existing
-- "_admin_all" policies were `for all` (select+insert+update+DELETE) --
-- no code path deletes these today (confirmed by grep across src/ and
-- supabase/), but RLS alone didn't actually forbid it, only convention
-- did. Split each into explicit select/insert/update policies (omitting
-- delete entirely) so even a compromised/misused admin session can't hard
-- -delete a master record at the database layer. Admin keeps every other
-- capability unchanged.
-- ---------------------------------------------------------------------

drop policy "schools_admin_all" on public.schools;
create policy "schools_admin_select" on public.schools
  for select to authenticated
  using (public.is_admin());
create policy "schools_admin_insert" on public.schools
  for insert to authenticated
  with check (public.is_admin());
create policy "schools_admin_update" on public.schools
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy "school_lists_admin_all" on public.school_lists;
create policy "school_lists_admin_select" on public.school_lists
  for select to authenticated
  using (public.is_admin());
create policy "school_lists_admin_insert" on public.school_lists
  for insert to authenticated
  with check (public.is_admin());
create policy "school_lists_admin_update" on public.school_lists
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy "school_list_versions_admin_all" on public.school_list_versions;
create policy "school_list_versions_admin_select" on public.school_list_versions
  for select to authenticated
  using (public.is_admin());
create policy "school_list_versions_admin_insert" on public.school_list_versions
  for insert to authenticated
  with check (public.is_admin());
create policy "school_list_versions_admin_update" on public.school_list_versions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy "school_list_items_admin_all" on public.school_list_items;
create policy "school_list_items_admin_select" on public.school_list_items
  for select to authenticated
  using (public.is_admin());
create policy "school_list_items_admin_insert" on public.school_list_items
  for insert to authenticated
  with check (public.is_admin());
create policy "school_list_items_admin_update" on public.school_list_items
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- RF-014: reviews moderation. RLS already allowed a user to insert/update
-- their own PENDING review (reviews_insert_own_pending/
-- reviews_update_own_pending, migration rls_community.sql) -- what was
-- missing is the admin decision side. Same shape as approve_submission/
-- reject_submission, including the self-review guard.
-- ---------------------------------------------------------------------

create or replace function public.admin_approve_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.reviews;
begin
  if not public.is_admin() then
    raise exception 'only admins may approve reviews';
  end if;

  select * into v_before from public.reviews where id = p_review_id for update;
  if v_before is null then
    raise exception 'review % not found', p_review_id;
  end if;
  if v_before.profile_id = auth.uid() then
    raise exception 'you cannot review your own review';
  end if;
  if v_before.status <> 'PENDING' then
    raise exception 'review % is not awaiting moderation (status=%)', p_review_id, v_before.status;
  end if;

  update public.reviews set status = 'APPROVED', moderated_by = auth.uid() where id = p_review_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'ADMIN_APPROVE_REVIEW', 'reviews', p_review_id, to_jsonb(v_before), jsonb_build_object('status', 'APPROVED'));
end;
$$;

create or replace function public.admin_reject_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.reviews;
begin
  if not public.is_admin() then
    raise exception 'only admins may reject reviews';
  end if;

  select * into v_before from public.reviews where id = p_review_id for update;
  if v_before is null then
    raise exception 'review % not found', p_review_id;
  end if;
  if v_before.profile_id = auth.uid() then
    raise exception 'you cannot review your own review';
  end if;
  if v_before.status <> 'PENDING' then
    raise exception 'review % is not awaiting moderation (status=%)', p_review_id, v_before.status;
  end if;

  update public.reviews set status = 'REJECTED', moderated_by = auth.uid() where id = p_review_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'ADMIN_REJECT_REVIEW', 'reviews', p_review_id, to_jsonb(v_before), jsonb_build_object('status', 'REJECTED'));
end;
$$;

-- ---------------------------------------------------------------------
-- RF-016: user role management ("Usuários" admin screen -- account,
-- status, papel per PRD section 16). profiles_admin_all already lets an
-- admin UPDATE any profile including role; this RPC exists for the audit
-- log (SEC-007) and the self-change guard, same reasoning as every other
-- admin decision function in this file.
-- ---------------------------------------------------------------------

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins may change user roles';
  end if;
  if p_role not in ('USER', 'EDITOR', 'SCHOOL_MANAGER', 'STORE_MANAGER', 'ADMIN', 'SUPER_ADMIN') then
    raise exception 'invalid role %', p_role;
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;

  select * into v_before from public.profiles where id = p_user_id for update;
  if v_before is null then
    raise exception 'user % not found', p_user_id;
  end if;

  update public.profiles set role = p_role::public.user_role where id = p_user_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'ADMIN_SET_USER_ROLE', 'profiles', p_user_id, to_jsonb(v_before), jsonb_build_object('role', p_role));
end;
$$;

-- ---------------------------------------------------------------------
-- SEC-008: basic rate limiting on login (highest-value target for
-- brute-force protection; broader coverage -- search, submission,
-- review, signup -- deliberately deferred, see gap-analysis doc). Keyed
-- by email + a best-effort client IP (x-forwarded-for) so an attacker
-- spamming failed attempts against a victim's email from one network
-- doesn't block that same victim logging in from their own. No RLS
-- policy at all -- anon has no business reading this table, only the two
-- SECURITY DEFINER functions below ever touch it, and unlike every other
-- admin function in this project these must be callable by `anon`
-- (login happens before authentication).
-- ---------------------------------------------------------------------

create table public.auth_login_attempts (
  id bigint generated always as identity primary key,
  identifier text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index auth_login_attempts_identifier_idx on public.auth_login_attempts (identifier, created_at desc);

alter table public.auth_login_attempts enable row level security;

create or replace function public.check_login_rate_limit(p_identifier text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_failures int;
begin
  select count(*) into v_recent_failures
  from public.auth_login_attempts
  where identifier = lower(trim(p_identifier))
    and success = false
    and created_at > now() - interval '15 minutes';

  return v_recent_failures < 5;
end;
$$;

create or replace function public.record_login_attempt(p_identifier text, p_success boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auth_login_attempts (identifier, success)
  values (lower(trim(p_identifier)), p_success);

  -- Best-effort housekeeping (no pg_cron job in this project) -- cheap
  -- relative to the insert it rides along with.
  delete from public.auth_login_attempts
  where identifier = lower(trim(p_identifier))
    and created_at < now() - interval '1 day';
end;
$$;

-- ---------------------------------------------------------------------
-- Grants: every function in the public schema grants EXECUTE to PUBLIC at
-- creation (Postgres default) -- `revoke ... from anon` alone is a no-op
-- (see 20260911150100_moderation_guards_fix_public_grant.sql); PUBLIC
-- itself must be revoked, then the intended role(s) granted explicitly.
-- check_login_rate_limit/record_login_attempt are the one deliberate
-- exception to "authenticated only" in this project -- anon needs them
-- too, since login happens pre-auth.
-- ---------------------------------------------------------------------

revoke execute on function public.admin_approve_review(uuid) from public;
revoke execute on function public.admin_reject_review(uuid) from public;
revoke execute on function public.admin_set_user_role(uuid, text) from public;
revoke execute on function public.check_login_rate_limit(text) from public;
revoke execute on function public.record_login_attempt(text, boolean) from public;

grant execute on function public.admin_approve_review(uuid) to authenticated;
grant execute on function public.admin_reject_review(uuid) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.check_login_rate_limit(text) to anon, authenticated;
grant execute on function public.record_login_attempt(text, boolean) to anon, authenticated;
