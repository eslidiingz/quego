-- 1. Service link + history snapshot columns on bookings.
alter table public.bookings
  add column if not exists service_id uuid references public.shop_services(id) on delete set null,
  add column if not exists service_name text,
  add column if not exists service_price numeric(10,2) check (service_price is null or service_price >= 0);

comment on column public.bookings.service_id is 'Bookable service chosen (NULL for legacy/implicit single-service shops). SET NULL on delete keeps history.';
comment on column public.bookings.service_name is 'Snapshot of the service name at booking time (survives rename/delete).';
comment on column public.bookings.service_price is 'Snapshot of the service price at booking time (NULL = unpriced).';

create index if not exists bookings_service_idx on public.bookings (service_id);

-- 2. Move to interval-overlap conflict detection.
-- A booking occupies [booking_date+slot_time, +service_duration_minutes).
-- With variable per-service durations, exact-slot-time uniqueness is no longer
-- sufficient, so a generated time range + GiST exclusion constraints become the
-- race backstop (replacing the two partial unique indexes).
create extension if not exists btree_gist;

alter table public.bookings
  add column if not exists time_range tsrange
  generated always as (
    tsrange(
      (booking_date + slot_time),
      (booking_date + slot_time) + make_interval(mins => service_duration_minutes)
    )
  ) stored;

drop index if exists public.bookings_unique_active_slot_noassign;
drop index if exists public.bookings_unique_active_slot_staff;

-- Staffed lines: one active staff member cannot hold two overlapping bookings.
alter table public.bookings
  add constraint bookings_no_overlap_staff
  exclude using gist (
    shop_id with =,
    staff_id with =,
    time_range with &&
  ) where (status in ('confirmed', 'completed') and staff_id is not null);

-- Legacy single queue (no staff assigned): no two active bookings may overlap.
alter table public.bookings
  add constraint bookings_no_overlap_noassign
  exclude using gist (
    shop_id with =,
    time_range with &&
  ) where (status in ('confirmed', 'completed') and staff_id is null);
