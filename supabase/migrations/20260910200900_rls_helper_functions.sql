-- RLS-checking helper functions -- split out from the first migration
-- because they reference tables (profiles, school_managers,
-- store_managers) that didn't exist yet at that point.
--
-- All run as SECURITY DEFINER so they can read those tables regardless of
-- the calling user's own row-level visibility into them (that's the whole
-- point -- an ordinary user's SELECT on profiles is restricted to their
-- own row, but is_admin() needs to check ANY user's role). search_path is
-- pinned on every one to avoid search-path hijacking.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('EDITOR', 'ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_school_manager(target_school_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.school_managers
    where school_id = target_school_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_store_manager(target_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.store_managers
    where store_id = target_store_id and profile_id = auth.uid()
  );
$$;
