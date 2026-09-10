-- Domain: Catalog / commerce
--
-- No checkout/payment tables anywhere in this schema, deliberately -- the
-- commercial model ends at an outbound link + tracking event (PRD section
-- 18, "Fora do MVP").

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  category text,
  created_at timestamptz not null default now()
);

create table public.ecommerce_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website text not null,
  integration_type public.ecommerce_integration_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_ecommerce_partners_updated_at
  before update on public.ecommerce_partners
  for each row execute function public.set_updated_at();

create table public.ecommerce_products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.ecommerce_partners (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  external_url text not null,
  price_hint numeric(10, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (partner_id, product_id)
);
