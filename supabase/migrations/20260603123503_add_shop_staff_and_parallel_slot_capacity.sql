-- 1. Staff roster table: one shop has many staff (parallel service lines)
create table if not exists public.shop_staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  nickname text,
  role text,
  phone text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_staff_shop_id_idx on public.shop_staff (shop_id);

-- RLS deny-all (authorization lives in the service layer via service-role client)
alter table public.shop_staff enable row level security;

-- 2. Link bookings to an (optional) staff member. Nullable so legacy/zero-staff
-- shops keep working and existing rows need no backfill.
alter table public.bookings
  add column if not exists staff_id uuid references public.shop_staff(id) on delete set null;

-- 3. Replace the single shop-level slot uniqueness with two partial indexes:
--    - per-staff: a staff member can hold only one active booking per slot
--      (capacity of a slot = number of active staff)
--    - shop-level fallback: shops with no staff keep "one active booking per
--      slot" exactly as before (all such rows have staff_id IS NULL)
drop index if exists public.bookings_unique_active_slot;

create unique index bookings_unique_active_slot_staff
  on public.bookings (staff_id, booking_date, slot_time)
  where status = any (array['confirmed'::booking_status, 'completed'::booking_status])
    and staff_id is not null;

create unique index bookings_unique_active_slot_noassign
  on public.bookings (shop_id, booking_date, slot_time)
  where status = any (array['confirmed'::booking_status, 'completed'::booking_status])
    and staff_id is null;