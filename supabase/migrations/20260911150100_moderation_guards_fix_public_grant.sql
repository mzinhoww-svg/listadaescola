-- Follow-up to 20260911150000_moderation_guards.sql, applied moments
-- later in the same session once the gap below was confirmed live via
-- pg_proc.proacl -- kept as its own migration (matching what was actually
-- run against the project) rather than folded back into the first file,
-- since that one was already applied.
--
-- `revoke execute ... from anon` in the previous migration (and, earlier,
-- in 20260910201900_advisor_fixes.sql for is_admin/is_staff/
-- is_school_manager/is_store_manager) never actually removed anon's
-- access. Every function in the public schema grants EXECUTE to PUBLIC at
-- creation (Postgres default); `authenticated`/`service_role` separately
-- get their own DIRECT grant from Supabase's project-level default
-- privileges. `anon` was never a direct grantee anywhere -- its access
-- came solely through PUBLIC. Revoking a privilege from a role that only
-- holds it via PUBLIC is a no-op in Postgres (there's no per-role
-- "negative" grant); PUBLIC itself has to be revoked. get_advisors()
-- correctly flags this as WARN for both approve_submission and
-- reject_submission/request_submission_correction -- verified directly
-- via `select proacl from pg_proc where proname = 'approve_submission'`
-- showing an `=X/postgres` (empty-role = PUBLIC) entry alongside the
-- `authenticated=X` one.
--
-- Not an actual exploit: each function's own `is_admin()` check still
-- rejects a non-admin caller (anon's auth.uid() is null) before any read
-- or write happens. But it's not the intended access model, so fixed
-- properly here for the four moderation functions this prompt already
-- touches. The same gap exists on is_admin/is_staff/is_school_manager/
-- is_store_manager/handle_new_user/guard_submission_status_transition
-- (Prompt 02/03's auth domain, not moderation) -- left for Prompt 16
-- (security audit) rather than widened into this one.

revoke execute on function public.approve_submission(uuid) from public;
revoke execute on function public.reject_submission(uuid, text) from public;
revoke execute on function public.request_submission_correction(uuid, text) from public;
revoke execute on function public.mark_submission_under_review(uuid) from public;
grant execute on function public.approve_submission(uuid) to authenticated;
grant execute on function public.reject_submission(uuid, text) to authenticated;
grant execute on function public.request_submission_correction(uuid, text) to authenticated;
grant execute on function public.mark_submission_under_review(uuid) to authenticated;
