-- Bind a LINE Messaging API userId to a SHOP so the system can push booking
-- notifications to the shop owner's LINE. The owner connects via LINE Login
-- (OAuth) from /shop/profile → การแจ้งเตือน; the callback stores the userId here.
--
-- Mirrors customers.line_user_id (20260608000000):
--   * line_user_id is NULLABLE — a shop is only notified once it has connected.
--     Uniqueness is a PARTIAL unique index over non-null values, so the many
--     un-linked shops don't collide. linkShopLine() guards this in app code; the
--     index is the race-proof 23505 backstop.
--   * No FK — the userId is an opaque external handle from LINE, not a row here.
--   * One LINE account maps to at most one shop and vice-versa.
--
-- RLS is already enabled on shops (deny-all). No policy change; access stays
-- service-role-only through the service layer.
--
-- Apply via: Supabase Dashboard → SQL Editor, the Supabase MCP (apply_migration),
-- or `psql "<pooler connection string>" -f <this file>`. Idempotent.

begin;

alter table public.shops
  add column if not exists line_user_id text;

create unique index if not exists shops_line_user_id_unique
  on public.shops (line_user_id)
  where line_user_id is not null;

comment on column public.shops.line_user_id is
  'LINE Messaging API userId bound via the shop LINE Login (OAuth) connect flow. Nullable; partial-unique on non-null values. Used to push booking notifications to the shop owner.';

commit;
