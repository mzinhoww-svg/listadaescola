-- Fixes for findings from get_advisors(security) after the schema above.
--
-- 1. function_search_path_mutable on set_updated_at -- pin it like every
--    other function (it doesn't reference any table by name today, but
--    pin it anyway for defense in depth / consistency).
--
-- 2/3. All 9 SECURITY DEFINER functions are, by Postgres default, EXECUTE-
--    granted to PUBLIC (anon + authenticated) the moment they're created.
--    That's wrong for all of them as anon, and wrong for the two
--    trigger-only functions even as authenticated:
--      - is_admin/is_staff/is_school_manager/is_store_manager: pure RLS
--        helpers. `authenticated` MUST keep EXECUTE -- RLS policies
--        scoped `to authenticated` call them, and the caller needs
--        EXECUTE on a function regardless of SECURITY DEFINER (that only
--        changes privileges *inside* the function, not whether you're
--        allowed to call it). `anon` never hits a policy branch that
--        calls them, so anon's default grant serves no purpose.
--      - handle_new_user/guard_submission_status_transition: trigger-only,
--        never invoked directly by anyone. Triggers fire based on table
--        privileges, not the firing role's EXECUTE grant on the trigger
--        function, so revoking from both anon and authenticated is safe.
--      - approve_submission/reject_submission/request_submission_correction:
--        the intended RPC surface for admins. `authenticated` must keep
--        EXECUTE (that's how the moderation UI calls them; the function
--        body still enforces is_admin() internally regardless of who
--        calls it). `anon` has no legitimate reason to call them.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_staff() from anon;
revoke execute on function public.is_school_manager(uuid) from anon;
revoke execute on function public.is_store_manager(uuid) from anon;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.guard_submission_status_transition() from anon, authenticated;

revoke execute on function public.approve_submission(uuid) from anon;
revoke execute on function public.reject_submission(uuid, text) from anon;
revoke execute on function public.request_submission_correction(uuid, text) from anon;
