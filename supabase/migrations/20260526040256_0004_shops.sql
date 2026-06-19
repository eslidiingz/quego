create table public.shops (
  id uuid primary key default gen_random_uuid(),

  -- Public profile
  name text not null,
  category_id uuid not null references public.shop_categories(id) on delete restrict,
  description text,
  address text,
  contact_phone text,

  -- Owner info (used by admin for approval contact + future shop login)
  owner_name text not null,
  owner_phone text not null,
  owner_email text,

  -- Approval workflow
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.admins(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shops_status_idx on public.shops (status);
create index shops_category_idx on public.shops (category_id);
create index shops_owner_phone_idx on public.shops (owner_phone);

create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.tg_set_updated_at();

alter table public.shops enable row level security;

-- Public can read APPROVED shops only (for customer discovery).
-- Admin moderation paths use service-role which bypasses RLS.
create policy "approved shops readable by anyone"
  on public.shops
  for select
  to anon, authenticated
  using (status = 'approved');
