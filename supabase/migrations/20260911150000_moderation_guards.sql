-- Prompt 11 (moderação): two additions to the Prompt 02 moderation
-- functions, both via `create or replace function` on a NEW migration --
-- the original 20260910201600_moderation_functions.sql is never edited.
-- (A third, real fix -- an anon-EXECUTE gap found while wiring this up --
-- landed in the very next migration, 20260911150100_..., once it was
-- actually confirmed; see that file.)
--
-- 1. Self-review guard: "Validar auth, RBAC, state transition e impedir
--    autor de aprovar própria submission" (prompt text). The existing
--    approve/reject/request_correction functions only ever checked
--    is_admin() -- nothing stopped an admin who happens to also be the
--    submission's own author from deciding on their own submission. The
--    guard applies to all three decision functions (not just approve):
--    self-reviewing your own rejection or correction request is the same
--    conflict-of-interest problem, just less obviously exploitable than
--    self-approval.
-- 2. mark_submission_under_review(): the PRD's own transition chain
--    (SUBMITTED -> UNDER_REVIEW -> APPROVED/REJECTED/NEEDS_CORRECTION)
--    had no dedicated function for the first hop -- an admin could only
--    reach UNDER_REVIEW via a raw UPDATE (the guard trigger already lets
--    admins do that), which meant that one transition, unlike every
--    other moderation action, was never audit-logged. Added for
--    audit-log completeness (SEC-007), not gated by self-review since
--    it's a neutral "someone is looking at this" marker, not a decision.

create or replace function public.approve_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.list_submissions;
  v_school_slug text;
  v_list_id uuid;
  v_version_id uuid;
  v_next_version int;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'only admins may approve submissions';
  end if;

  select * into v_submission from public.list_submissions where id = p_submission_id for update;
  if v_submission is null then
    raise exception 'submission % not found', p_submission_id;
  end if;
  if v_submission.submitted_by = auth.uid() then
    raise exception 'you cannot review your own submission';
  end if;
  if v_submission.status not in ('SUBMITTED', 'UNDER_REVIEW') then
    raise exception 'submission % is not awaiting review (status=%)', p_submission_id, v_submission.status;
  end if;

  select id into v_list_id
  from public.school_lists
  where school_id = v_submission.school_id
    and education_level = v_submission.education_level
    and series_name = v_submission.series_name
    and school_year = v_submission.school_year;

  if v_list_id is null then
    select slug into v_school_slug from public.schools where id = v_submission.school_id;
    v_slug := public.slugify(
      coalesce(v_school_slug, v_submission.school_id::text)
      || '-' || v_submission.school_year::text
      || '-' || v_submission.series_name
    );

    insert into public.school_lists (school_id, education_level, series_name, school_year, slug)
    values (v_submission.school_id, v_submission.education_level, v_submission.series_name, v_submission.school_year, v_slug)
    returning id into v_list_id;
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_version
  from public.school_list_versions where school_list_id = v_list_id;

  insert into public.school_list_versions (school_list_id, version_number, submission_id, published_by)
  values (v_list_id, v_next_version, p_submission_id, auth.uid())
  returning id into v_version_id;

  insert into public.school_list_items (school_list_version_id, name, quantity, unit, brand, is_required, notes, sort_order)
  select v_version_id, name, quantity, unit, brand, is_required, notes, sort_order
  from public.submission_items
  where submission_id = p_submission_id;

  update public.list_submissions
  set status = 'APPROVED', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'APPROVE_SUBMISSION', 'list_submissions', p_submission_id,
    to_jsonb(v_submission), jsonb_build_object('status', 'APPROVED', 'school_list_version_id', v_version_id)
  );

  return v_version_id;
end;
$$;

create or replace function public.reject_submission(p_submission_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.list_submissions;
begin
  if not public.is_admin() then
    raise exception 'only admins may reject submissions';
  end if;

  select * into v_before from public.list_submissions where id = p_submission_id for update;
  if v_before is null then
    raise exception 'submission % not found', p_submission_id;
  end if;
  if v_before.submitted_by = auth.uid() then
    raise exception 'you cannot review your own submission';
  end if;
  if v_before.status not in ('SUBMITTED', 'UNDER_REVIEW') then
    raise exception 'submission % is not awaiting review (status=%)', p_submission_id, v_before.status;
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'a rejection reason is required';
  end if;

  update public.list_submissions
  set status = 'REJECTED', rejection_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'REJECT_SUBMISSION', 'list_submissions', p_submission_id,
    to_jsonb(v_before), jsonb_build_object('status', 'REJECTED', 'rejection_reason', p_reason)
  );
end;
$$;

create or replace function public.request_submission_correction(p_submission_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.list_submissions;
begin
  if not public.is_admin() then
    raise exception 'only admins may request corrections';
  end if;

  select * into v_before from public.list_submissions where id = p_submission_id for update;
  if v_before is null then
    raise exception 'submission % not found', p_submission_id;
  end if;
  if v_before.submitted_by = auth.uid() then
    raise exception 'you cannot review your own submission';
  end if;
  if v_before.status not in ('SUBMITTED', 'UNDER_REVIEW') then
    raise exception 'submission % is not awaiting review (status=%)', p_submission_id, v_before.status;
  end if;
  if p_notes is null or length(trim(p_notes)) = 0 then
    raise exception 'correction notes are required';
  end if;

  update public.list_submissions
  set status = 'NEEDS_CORRECTION', correction_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'REQUEST_SUBMISSION_CORRECTION', 'list_submissions', p_submission_id,
    to_jsonb(v_before), jsonb_build_object('status', 'NEEDS_CORRECTION', 'correction_notes', p_notes)
  );
end;
$$;

create or replace function public.mark_submission_under_review(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.list_submissions;
begin
  if not public.is_admin() then
    raise exception 'only admins may review submissions';
  end if;

  select * into v_before from public.list_submissions where id = p_submission_id for update;
  if v_before is null then
    raise exception 'submission % not found', p_submission_id;
  end if;
  if v_before.status <> 'SUBMITTED' then
    raise exception 'submission % is not awaiting review (status=%)', p_submission_id, v_before.status;
  end if;

  update public.list_submissions
  set status = 'UNDER_REVIEW', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'MARK_SUBMISSION_UNDER_REVIEW', 'list_submissions', p_submission_id,
    to_jsonb(v_before), jsonb_build_object('status', 'UNDER_REVIEW')
  );
end;
$$;

-- approve_submission/reject_submission/request_submission_correction keep
-- their existing grants untouched (create or replace never resets ACLs;
-- advisor_fixes.sql already revoked anon and left authenticated granted).
-- mark_submission_under_review is brand new and defaults to PUBLIC
-- EXECUTE at creation -- same asymmetric fix as the other three: anon
-- revoked, authenticated keeps the default grant (the moderation UI
-- calls this as authenticated; is_admin() gates it internally).
--
-- **This revoke turned out to be a no-op -- see
-- 20260911150100_moderation_guards_fix_public_grant.sql, applied right
-- after this one in the same session, for why and for the real fix.**
-- Left as originally applied (not rewritten) rather than edited after the
-- fact, matching the project rule of never editing an already-applied
-- migration; the follow-up migration is the actual fix.
revoke execute on function public.mark_submission_under_review(uuid) from anon;
