create table if not exists public.shop_services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (length(btrim(name)) >= 1 and length(btrim(name)) <= 120),
  description text check (description is null or length(description) <= 500),
  duration_minutes integer not null
    check (duration_minutes >= 10 and duration_minutes <= 480 and (duration_minutes % 10) = 0),
  price numeric(10,2) check (price is null or price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shop_services is 'Bookable services offered by a shop (e.g. haircut, coloring). Duration drives slot generation; price is optional.';

create index if not exists shop_services_shop_idx
  on public.shop_services (shop_id, sort_order, created_at);

alter table public.shop_services enable row level security;
-- RLS deny-all (no policies): all access goes through the service-role client,
-- matching every other app table in this project.
