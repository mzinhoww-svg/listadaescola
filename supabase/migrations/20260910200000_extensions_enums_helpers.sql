-- Extensions, enums and table-independent helper functions.
-- RLS-checking helpers (is_admin, is_school_manager, ...) live in a later
-- migration because they reference tables created after this one.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Enums

create type public.user_role as enum (
  'USER', 'EDITOR', 'SCHOOL_MANAGER', 'STORE_MANAGER', 'ADMIN', 'SUPER_ADMIN'
);

create type public.school_type as enum ('PUBLIC', 'PRIVATE');

create type public.location_type as enum ('URBAN', 'RURAL');

-- Shared by list_submissions and school_suggestions (see PRD section 9).
create type public.submission_status as enum (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'ARCHIVED'
);

create type public.review_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create type public.campaign_status as enum ('SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED');

create type public.campaign_entity_type as enum ('SCHOOL', 'STORE');

create type public.favorite_target_type as enum ('SCHOOL', 'LIST');

create type public.report_status as enum ('OPEN', 'RESOLVED', 'DISMISSED');

create type public.ecommerce_integration_type as enum ('DEEP_LINK', 'PAGE', 'CART');

-- Generic updated_at maintenance, attached per-table as each is created.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ASCII slug helper (handles Portuguese accents via unaccent). Immutable so
-- it can be used in generated columns/indexes if ever needed.
create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;
