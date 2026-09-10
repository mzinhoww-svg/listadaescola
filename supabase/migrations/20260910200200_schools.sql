-- Domain: Geography/INEP + Schools/editorial
--
-- Columns on `schools` up to `cep_source` are INEP-controlled (see
-- docs/architecture/inep-import.md) -- the importer only ever touches
-- those. Everything editorial lives in school_profiles / school_contacts /
-- school_images so the importer can never clobber community/editorial
-- content (PRD RN-002, RN-006).

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  inep_code text not null unique,
  name text not null,
  slug text not null unique,
  uf text not null,
  municipality text not null,
  location_type public.location_type,
  differentiated_location text,
  school_type public.school_type not null,
  address text,
  phone text,
  administrative_dependency text,
  private_school_category text,
  public_power_agreement text,
  education_council_regulation text,
  school_size text,
  education_offerings text,
  other_education_offerings text,
  attendance_restriction text,
  latitude double precision,
  longitude double precision,
  location geography(Point, 4326) generated always as (
    case
      when longitude is not null and latitude is not null
        then extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::geography
      else null
    end
  ) stored,
  cep text,
  cep_source text,
  is_active boolean not null default true,
  source text not null default 'INEP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_schools_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

create table public.school_profiles (
  school_id uuid primary key references public.schools (id) on delete cascade,
  description text,
  logo_url text,
  website text,
  instagram text,
  whatsapp text,
  is_verified boolean not null default false,
  is_sponsored boolean not null default false,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_school_profiles_updated_at
  before update on public.school_profiles
  for each row execute function public.set_updated_at();

create table public.school_contacts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  contact_type text not null,
  value text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.school_images (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  storage_path text not null,
  caption text,
  is_approved boolean not null default false,
  submitted_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.school_education_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  education_level text not null,
  unique (school_id, education_level)
);

create table public.school_series (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  education_level text not null,
  series_name text not null,
  created_at timestamptz not null default now(),
  unique (school_id, education_level, series_name)
);

create table public.school_managers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (school_id, profile_id)
);

-- Community suggestions for schools not yet in the INEP base (PRD RF-008).
-- Never creates an official `schools` row directly -- an admin does that
-- manually after reviewing the suggestion.
create table public.school_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null references public.profiles (id),
  name text not null,
  uf text not null,
  municipality text not null,
  address text,
  phone text,
  school_type public.school_type,
  notes text,
  status public.submission_status not null default 'SUBMITTED',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
