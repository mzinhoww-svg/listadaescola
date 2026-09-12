-- Design/UX audit fix: school and store PROFILE pages read a static,
-- never-updated `is_sponsored` column (school_profiles.is_sponsored /
-- stores.is_sponsored, both `default false`, nothing in src/lib/admin
-- ever writes to either -- confirmed by grep) instead of computing
-- sponsorship live from an active campaign, the way search_schools()
-- already does (20260911170000_ranking_patrocinio.sql). Result: a school
-- with a real ACTIVE campaign shows "PATROCINADA" on every listing
-- surface (search results, home destaques) but not on its own profile
-- page -- the one page the sponsor is actually paying to be seen on.
--
-- Can't fix this with a plain client-side query against `campaigns`:
-- that table has only an admin RLS policy (campaigns_admin_all, see
-- rls_campaigns_analytics_audit.sql), so an anon/authenticated caller
-- would just get 0 rows -- the exact same reasoning already documented
-- in ranking_patrocinio.sql for why search_schools() itself had to be
-- SECURITY DEFINER. Same fix here, scoped to a single boolean instead of
-- exposing any campaign row (dates, priority, created_by stay hidden).
create or replace function public.is_entity_sponsored(p_entity_type public.campaign_entity_type, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.campaigns
    where entity_type = p_entity_type
      and entity_id = p_entity_id
      and status = 'ACTIVE'
      and now() between starts_at and ends_at
  );
$$;

comment on function public.is_entity_sponsored(public.campaign_entity_type, uuid) is
  'Live sponsorship check for a single school/store, mirroring search_schools()''s campaign predicate. SECURITY DEFINER because campaigns has no public RLS policy; returns only a boolean, never raw campaign rows.';

revoke execute on function public.is_entity_sponsored(public.campaign_entity_type, uuid) from public;
grant execute on function public.is_entity_sponsored(public.campaign_entity_type, uuid) to anon, authenticated;
