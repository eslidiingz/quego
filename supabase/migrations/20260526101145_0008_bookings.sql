-- Customer bookings: anonymous booking by name + phone, one row per slot.
-- RLS deny-all so all writes/reads go through the service-role admin client
-- in server actions (no client-side direct access).

create type public.booking_status as enum (
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_name text not null
    check (length(btrim(customer_name)) between 1 and 100),
  customer_phone text not null
    check (customer_phone ~ '^[0-9]{9,10}$'),
  booking_date date not null,
  slot_time time without time zone not null
    check (
      extract(minute from slot_time)::int % 10 = 0
      and extract(second from slot_time)::int = 0
    ),
  -- Snapshot of the shop's per-service duration AT BOOKING TIME so changes
  -- to the shop's service_duration_minutes later don't affect existing rows.
  service_duration_minutes integer not null
    check (
      service_duration_minutes between 10 and 480
      and service_duration_minutes % 10 = 0
    ),
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active booking per (shop, date, slot). Cancelled rows are excluded so a
-- customer can rebook a slot that was previously cancelled.
create unique index bookings_unique_active_slot
  on public.bookings (shop_id, booking_date, slot_time)
  where status in ('confirmed', 'completed');

create index bookings_shop_date_idx
  on public.bookings (shop_id, booking_date);
create index bookings_customer_phone_idx
  on public.bookings (customer_phone);

alter table public.bookings enable row level security;
-- No policies: deny-all for anon/authenticated. Service role bypasses RLS.

create or replace function public.tg_bookings_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

revoke all on function public.tg_bookings_set_updated_at() from public;

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.tg_bookings_set_updated_at();