-- Customer reviews: a member's star rating (1-5 integer) + optional comment for
-- a COMPLETED booking. Eligibility (logged-in customer whose booking the shop
-- marked 'completed') is enforced in the service layer; this table is the store.
--
-- Model decisions:
--   * One review per BOOKING (unique on booking_id). A repeat customer with N
--     completed bookings can leave N reviews. The unique index is the race-proof
--     backstop for a double-submit -> 23505, mapped back to "already reviewed".
--   * customer_phone is the identity key (mirrors bookings.customer_phone; same
--     9-10 digit check). No FK to customers — anonymous/shop-made/authed bookings
--     all key off phone, exactly like bookings do.
--   * customer_name is a display SNAPSHOT taken at review time (survives a later
--     profile rename); it is masked at render for PDPA, never shown verbatim.
--   * rating is smallint constrained to 1..5 (whole numbers only — no decimals).
--   * comment optional; trimmed non-empty when present, capped at 1000 chars.
--   * shop_id denormalised from the booking so rating aggregation filters/indexes
--     on it directly without a join.
--
-- RLS is enabled with NO policies = deny-all, consistent with every other app
-- table. All access goes through the service-role client in the service layer.

begin;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_phone text not null check (customer_phone ~ '^[0-9]{9,10}$'),
  customer_name text,
  rating smallint not null check (rating between 1 and 5),
  comment text check (
    comment is null
    or (length(btrim(comment)) >= 1 and char_length(comment) <= 1000)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_booking_id_key unique (booking_id)
);

-- Aggregation reads filter by shop_id (card + detail rating); customer lookups
-- filter by phone (a customer's own reviews / eligibility cross-check).
create index if not exists reviews_shop_id_idx on public.reviews (shop_id);
create index if not exists reviews_customer_phone_idx on public.reviews (customer_phone);

alter table public.reviews enable row level security;

comment on table public.reviews is
  'Customer star reviews (1-5 integer + optional comment) for completed bookings. One review per booking (unique booking_id). RLS deny-all; access via service-role only. customer_phone is the identity key (mirrors bookings); customer_name is a display snapshot, masked at render for PDPA.';

commit;