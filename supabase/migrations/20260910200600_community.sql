-- Domain: Community

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.favorite_target_type not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (profile_id, target_type, target_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  status public.review_status not null default 'PENDING',
  moderated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, profile_id)
);

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'OPEN',
  created_at timestamptz not null default now()
);
