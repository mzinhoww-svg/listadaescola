-- Follow-up to 20260911160000_admin_crud.sql, applied moments later once
-- this was confirmed live via pg_proc.proacl -- kept as its own migration
-- (matching what was actually run) rather than folded back into the
-- first file, since that one was already applied.
--
-- This is a DIFFERENT gap from the one documented in
-- moderation_guards_fix_public_grant.sql. That one was: `revoke ... from
-- anon` is a no-op when anon's only access is the implicit PUBLIC grant.
-- This one is the mirror image: `revoke ... from public` (what this
-- migration's predecessor did) does nothing when anon ALSO holds a
-- separate DIRECT grant from a project-level default privilege --
-- confirmed via:
--   select * from pg_default_acl where defaclnamespace = 'public'::regnamespace;
-- which shows a `defaclobjtype = 'f'` (functions) row for role `postgres`
-- granting EXECUTE to anon/authenticated/service_role on every function
-- `postgres` creates in `public` from now on. Comparing proacl for
-- Prompt 11's functions (approve_submission etc, created before this
-- default privilege existed -- no `anon=` entry at all, genuinely clean)
-- against this prompt's brand-new functions (created after -- a real
-- `anon=X/postgres` direct entry) confirms the default was added to this
-- project sometime between those two points in this same session, not a
-- pre-existing condition Prompt 11 missed.
--
-- Not an actual exploit today, same as every prior instance of this
-- class of finding: every function here still starts with
-- `if not public.is_admin() then raise exception ...`, and anon's
-- auth.uid() is null, so is_admin() is false and the call is rejected
-- before any read or write. But it is not the intended access model, so
-- fixed properly: both the 9 functions this project already has that
-- were created after the default appeared, AND the default itself, so
-- Prompt 13+ doesn't silently reintroduce this on every new function.

-- Root cause: stop granting anon EXECUTE by default on functions the
-- `postgres` role creates in `public` from this point forward. Not
-- retroactive (default privilege changes only affect objects created
-- after this statement runs), hence the explicit per-function revokes
-- below for what already exists.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

revoke execute on function public.unique_slug(text, text, uuid) from anon;
revoke execute on function public.admin_update_school(uuid, boolean, text, text, text, text, text, boolean) from anon;
revoke execute on function public.admin_upsert_store(uuid, text, text, text, text, double precision, double precision, text, text, boolean, boolean, boolean) from anon;
revoke execute on function public.admin_upsert_ecommerce_partner(uuid, text, text, text, text, boolean) from anon;
revoke execute on function public.admin_upsert_product(uuid, text, text, text) from anon;
revoke execute on function public.admin_upsert_ecommerce_product(uuid, uuid, uuid, text, numeric, boolean) from anon;
revoke execute on function public.admin_set_school_list_status(uuid, text) from anon;
revoke execute on function public.approve_school_suggestion(uuid) from anon;
revoke execute on function public.reject_school_suggestion(uuid, text) from anon;
