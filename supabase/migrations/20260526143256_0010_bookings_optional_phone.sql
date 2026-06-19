-- Shop owners booking on behalf of walk-in / phone-in customers may not
-- have the customer's number — allow NULL phone, but still constrain the
-- format whenever a value IS provided.

alter table public.bookings alter column customer_phone drop not null;

alter table public.bookings drop constraint bookings_customer_phone_check;

alter table public.bookings
  add constraint bookings_customer_phone_check
  check (customer_phone is null or customer_phone ~ '^[0-9]{9,10}$');