-- Bind a LINE Messaging API userId to a customer. Phone stays the identity key
-- (bookings link by phone); line_user_id is an ADDITIONAL, optional channel
-- handle used to deliver queue notifications. One LINE account maps to at most
-- one customer and vice-versa.
--
-- Model decisions:
--   * line_user_id is NULLABLE — most customers never link LINE. Uniqueness is a
--     PARTIAL unique index over non-null values only, so the many un-linked rows
--     don't collide. redeemLineLinkCode() guards this in app code; the index is
--     the race-proof 23505 backstop (mirrors the customers PIN duplicate path).
--   * No FK — the userId is an opaque external handle from LINE, not a row here.
--
-- RLS is already enabled on customers (deny-all). No policy change; access stays
-- service-role-only through the service layer.
--
-- Apply via: Supabase Dashboard → SQL Editor, the Supabase MCP (apply_migration),
-- or `psql "<pooler connection string>" -f <this file>`. Idempotent.

begin;

alter table public.customers
  add column if not exists line_user_id text;

create unique index if not exists customers_line_user_id_unique
  on public.customers (line_user_id)
  where line_user_id is not null;

comment on column public.customers.line_user_id is
  'LINE Messaging API userId bound via the in-app deep-link flow. Nullable; partial-unique on non-null values. Phone remains the identity key; this is an optional notification channel handle.';

commit;
