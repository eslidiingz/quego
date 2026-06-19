alter table public.bookings
  add column if not exists cancelled_by text
    check (cancelled_by is null or cancelled_by in ('customer', 'shop'));

comment on column public.bookings.cancelled_by is
  'Who cancelled the booking: ''customer'' (self-service cancel) or ''shop'' (shop-initiated). NULL when not cancelled or source unknown (legacy / ex-no_show rows). Drives the cancel-source badge and which party receives the LINE cancellation push.';