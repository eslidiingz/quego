-- OPP-04: shop-configurable cutoff (hours before a slot) for customer-initiated
-- reschedule/cancel. 0 = no restriction (today's behaviour: allowed up to start).
alter table public.shops
  add column if not exists reschedule_cancel_cutoff_hours integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_cutoff_hours_range'
  ) then
    alter table public.shops
      add constraint shops_cutoff_hours_range
      check (reschedule_cancel_cutoff_hours >= 0 and reschedule_cancel_cutoff_hours <= 168);
  end if;
end $$;

-- OPP-03: timestamp the customer tapped "กำลังมา" in LINE (arrival ack). Null =
-- not acknowledged. Surfaced as a shop-dashboard badge; idempotent (set once).
alter table public.bookings
  add column if not exists coming_ack_at timestamptz;