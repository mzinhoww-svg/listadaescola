-- Domain: Stores (papelarias)

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  uf text not null,
  municipality text not null,
  address text,
  latitude double precision,
  longitude double precision,
  location geography(Point, 4326) generated always as (
    case
      when longitude is not null and latitude is not null
        then extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::geography
      else null
    end
  ) stored,
  whatsapp text not null,
  opening_hours text,
  offers_delivery boolean not null default false,
  offers_pickup boolean not null default false,
  is_active boolean not null default true,
  is_sponsored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_stores_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

create table public.store_contacts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  contact_type text not null,
  value text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.store_services (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  service text not null,
  unique (store_id, service)
);

create table public.store_managers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (store_id, profile_id)
);
