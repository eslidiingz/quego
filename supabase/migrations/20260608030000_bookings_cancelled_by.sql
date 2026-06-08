-- Record WHO cancelled a booking so the shop (and the customer) can tell a
-- customer-initiated cancel apart from a shop-initiated one after the fact.
--
-- bookings.status only says "cancelled"; this column says by whom. It drives:
--   * the shop dashboard badge ("ลูกค้ายกเลิก" vs "ร้านยกเลิก"),
--   * the customer's "คิวของฉัน" badge ("คุณยกเลิก" vs "ร้านยกเลิก"),
--   * which side receives the LINE cancellation push (always the OTHER party —
--     a customer cancel pings the shop, a shop cancel pings the customer; the
--     recipient already implies the source, so the push needs no extra label).
--
-- NULLABLE: only set when status = 'cancelled'. Historical cancelled rows
-- (incl. the ex-no_show rows folded into 'cancelled' in 20260607082054) stay
-- NULL = "source unknown", which the UI renders as a plain "ยกเลิก" chip.
--
-- A plain text + CHECK column (not an enum) — only two stable values, and this
-- sidesteps the Postgres can't-drop-an-enum-value pain seen with booking_status.
--
-- RLS unchanged (bookings is deny-all; service-role access only).
-- Apply via: Supabase MCP (apply_migration), Dashboard SQL Editor, or
-- `psql "<pooler connection string>" -f <this file>`. Idempotent.

begin;

alter table public.bookings
  add column if not exists cancelled_by text
    check (cancelled_by is null or cancelled_by in ('customer', 'shop'));

comment on column public.bookings.cancelled_by is
  'Who cancelled the booking: ''customer'' (self-service cancel) or ''shop'' (shop-initiated). NULL when not cancelled or source unknown (legacy / ex-no_show rows). Drives the cancel-source badge and which party receives the LINE cancellation push.';

commit;
