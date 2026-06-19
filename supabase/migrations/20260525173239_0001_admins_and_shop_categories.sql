-- Helper: updated_at touch trigger
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Admins (custom auth, NOT auth.users)
-- Admin sessions are signed cookies issued by the Next.js server.
-- All access happens via the Supabase service-role key, which bypasses RLS.
create table public.admins (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  password_hash text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admins_set_updated_at
  before update on public.admins
  for each row execute function public.tg_set_updated_at();

-- Shop categories — the taxonomy admins curate, customers filter by.
create table public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.admins(id) on delete set null,
  updated_by uuid references public.admins(id) on delete set null
);

create index shop_categories_sort_order_idx on public.shop_categories (sort_order, name);

create trigger shop_categories_set_updated_at
  before update on public.shop_categories
  for each row execute function public.tg_set_updated_at();

-- RLS: lock everything down; service-role key bypasses these policies.
alter table public.admins enable row level security;
alter table public.shop_categories enable row level security;

-- Read-only public access to ACTIVE categories for customer browsing.
create policy "active categories readable by anon"
  on public.shop_categories
  for select
  to anon, authenticated
  using (is_active = true);
