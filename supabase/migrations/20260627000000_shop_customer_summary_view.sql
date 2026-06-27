-- CRM-lite customer LIST (OPP-14, Phase 3). One row per (shop, customer_phone)
-- so the shop can browse/search/sort its customers without the app fetching
-- every booking row and grouping in JS (which would silently truncate at
-- PostgREST's row cap for busy shops). Read-only aggregate over `bookings`.
--
-- Anonymous walk-ins (customer_phone IS NULL) are EXCLUDED: they have no CRM
-- identity, can't open a /shop/customers/[phone] profile, and would otherwise
-- collapse every distinct anonymous person into one bogus "customer" row.
--
-- security_invoker = true → the view runs with the CALLER's privileges, so it
-- inherits `bookings`' deny-all RLS for the anon/publishable key (no data leak
-- via the view). The app reads it through the service-role client, which
-- bypasses RLS, so it still sees every row. Ownership is scoped in app code by
-- filtering .eq("shop_id", <session shopId>), same as every other service read.
create or replace view public.shop_customer_summary
with (security_invoker = true) as
select
  b.shop_id,
  b.customer_phone,
  -- Most recent name on record is the customer's preferred display name.
  (array_agg(b.customer_name order by b.booking_date desc, b.slot_time desc))[1]
    as display_name,
  count(*) filter (where b.status = 'completed')              as total_visits,
  coalesce(sum(b.service_price) filter (where b.status = 'completed'), 0)
    as lifetime_spend,
  count(*) filter (where b.status = 'confirmed')              as upcoming_count,
  count(*) filter (where b.status = 'cancelled')              as cancelled_count,
  min(b.booking_date)                                         as first_visit,
  max(b.booking_date)                                         as last_visit,
  max(b.booking_date) filter (where b.status = 'completed')   as last_completed_visit
from public.bookings b
where b.customer_phone is not null
group by b.shop_id, b.customer_phone;
