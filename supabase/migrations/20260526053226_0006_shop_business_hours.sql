-- One row per (shop, day-of-week). Days follow the JS `Date.getDay()`
-- convention: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
-- A day with `is_open = false` keeps the time columns NULL.
create table public.shop_business_hours (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_open boolean not null default false,
  open_time time,
  close_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (shop_id, day_of_week),

  -- Enforce time consistency at the DB layer so a buggy client can't write
  -- "open with no times" or "closed but with times".
  constraint open_requires_times check (
    (is_open = false and open_time is null and close_time is null)
    or (is_open = true and open_time is not null and close_time is not null)
  ),
  -- Same-day operating window: open < close. Overnight hours (e.g. 22:00
  -- → 02:00) will need a separate model and aren't allowed yet.
  constraint open_before_close check (
    is_open = false or open_time < close_time
  )
);

create index shop_business_hours_shop_idx
  on public.shop_business_hours (shop_id);

create trigger shop_business_hours_set_updated_at
  before update on public.shop_business_hours
  for each row execute function public.tg_set_updated_at();

alter table public.shop_business_hours enable row level security;

-- Public can read hours of APPROVED shops (for the customer discovery page).
create policy "hours readable for approved shops"
  on public.shop_business_hours
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.shops s
      where s.id = shop_business_hours.shop_id
        and s.status = 'approved'
    )
  );
