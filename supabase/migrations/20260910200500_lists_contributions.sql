-- Domain: Lists / contributions
--
-- school_lists / school_list_versions / school_list_items are NEVER
-- written to directly by any client role (see migration
-- moderation_functions) -- the only path in is the approve_submission()
-- SECURITY DEFINER function called during moderation. This is the
-- literal instruction from the prompt ("usuario nao pode escrever
-- diretamente em school_lists"), stricter than the original draft matrix
-- in docs/security/rls.md (which said "manager" for these three tables);
-- that doc is updated in this same PR to match.

create table public.school_lists (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  education_level text not null,
  series_name text not null,
  school_year int not null,
  slug text not null unique,
  status text not null default 'APPROVED' check (status in ('APPROVED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, education_level, series_name, school_year)
);

create trigger set_school_lists_updated_at
  before update on public.school_lists
  for each row execute function public.set_updated_at();

create table public.school_list_versions (
  id uuid primary key default gen_random_uuid(),
  school_list_id uuid not null references public.school_lists (id) on delete cascade,
  version_number int not null,
  status text not null default 'PUBLISHED' check (status in ('PUBLISHED', 'ARCHIVED')),
  submission_id uuid,
  published_by uuid references public.profiles (id),
  published_at timestamptz not null default now(),
  unique (school_list_id, version_number)
);

create table public.school_list_items (
  id uuid primary key default gen_random_uuid(),
  school_list_version_id uuid not null references public.school_list_versions (id) on delete cascade,
  name text not null,
  quantity int not null default 1 check (quantity > 0),
  unit text,
  brand text,
  is_required boolean not null default true,
  notes text,
  product_id uuid references public.products (id),
  sort_order int not null default 0
);

-- Community contribution -- private until approved, then promoted into
-- school_lists via approve_submission(). `school_id` is required: the
-- separate /sugerir-escola flow (school_suggestions) handles schools that
-- don't exist yet.
create table public.list_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id),
  submitted_by uuid not null references public.profiles (id),
  education_level text not null,
  series_name text not null,
  school_year int not null,
  status public.submission_status not null default 'DRAFT',
  rejection_reason text,
  correction_notes text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.school_list_versions
  add constraint school_list_versions_submission_id_fkey
  foreign key (submission_id) references public.list_submissions (id);

create trigger set_list_submissions_updated_at
  before update on public.list_submissions
  for each row execute function public.set_updated_at();

create table public.submission_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.list_submissions (id) on delete cascade,
  name text not null,
  quantity int not null default 1 check (quantity > 0),
  unit text,
  brand text,
  is_required boolean not null default true,
  notes text,
  sort_order int not null default 0
);

create table public.submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.list_submissions (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Per-item outbound commerce mapping (PRD section 10 conceptual model:
-- school_lists -> list_product_mappings -> ecommerce_products -> partners).
create table public.list_product_mappings (
  id uuid primary key default gen_random_uuid(),
  school_list_item_id uuid not null references public.school_list_items (id) on delete cascade,
  ecommerce_product_id uuid not null references public.ecommerce_products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (school_list_item_id, ecommerce_product_id)
);
