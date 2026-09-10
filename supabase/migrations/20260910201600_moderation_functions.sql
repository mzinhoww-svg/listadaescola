-- Moderation functions -- the only way any submission ever reaches
-- school_lists (approve_submission) or gets rejected/sent back
-- (reject_submission / request_correction). All three are SECURITY
-- DEFINER and gate on is_admin() internally, since school_lists has no
-- direct-write RLS policy for any client role (see migration
-- rls_lists_submissions).

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
