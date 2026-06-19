-- Retire the `no_show` value from the booking_status enum.
-- See supabase/migrations/20260607150000_drop_no_show_enum_value.sql for rationale.

-- 0. safety: ensure no row still carries the value (no-op if already backfilled)
update public.bookings
set status = 'cancelled'::booking_status
where status::text = 'no_show';

-- 1. drop the exclusion constraints that depend on the enum type
alter table public.bookings drop constraint if exists bookings_no_overlap_noassign;
alter table public.bookings drop constraint if exists bookings_no_overlap_staff;

-- 2. rename-and-recreate booking_status without `no_show`
alter type booking_status rename to booking_status_old;
create type booking_status as enum ('confirmed', 'cancelled', 'completed');

alter table public.bookings alter column status drop default;
alter table public.bookings
  alter column status type booking_status using status::text::booking_status;
alter table public.bookings alter column status set default 'confirmed'::booking_status;

drop type booking_status_old;

-- 3. recreate the exclusion constraints (definitions captured verbatim)
alter table public.bookings add constraint bookings_no_overlap_noassign
  exclude using gist (shop_id with =, time_range with &&)
  where (status = any (array['confirmed'::booking_status, 'completed'::booking_status]) and staff_id is null);

alter table public.bookings add constraint bookings_no_overlap_staff
  exclude using gist (shop_id with =, staff_id with =, time_range with &&)
  where (status = any (array['confirmed'::booking_status, 'completed'::booking_status]) and staff_id is not null);