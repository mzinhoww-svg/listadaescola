-- Domain: Analytics + Security/moderation
--
-- Both tables get zero client-facing RLS policies (see next migration) --
-- RF-015 requires analytics to be written server-side only, never exposed
-- directly to the browser. Prompt 14 extends analytics_events with the
-- commercial reporting tables (sales, comissions); this is the base event
-- log covering the RF-015 event list generically.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  profile_id uuid references public.profiles (id),
  session_id text,
  school_id uuid references public.schools (id),
  store_id uuid references public.stores (id),
  list_id uuid references public.school_lists (id),
  partner_id uuid references public.ecommerce_partners (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
