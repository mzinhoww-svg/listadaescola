-- Domain: Monetization
--
-- Sponsorship only -- no payment processing lives here or anywhere in this
-- schema. Priority/period are configurable inputs to the ranking algorithm
-- (Prompt 13); sponsorship must never affect the organic rating (RF-003).

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  entity_type public.campaign_entity_type not null,
  entity_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  priority int not null default 0,
  status public.campaign_status not null default 'SCHEDULED',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
