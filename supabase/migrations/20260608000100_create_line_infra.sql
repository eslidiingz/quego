-- LINE Messaging infra tables.
--
-- line_message_log — a fail-silent send is still OBSERVABLE: every outbound
--   push/reply outcome (incl. dropped / over_quota) and inbound webhook delivery
--   lands here so quota drops aren't invisible and we can dedupe by LINE's
--   message id. LINE pushes bill per recipient and silently drop over-quota
--   (OPP-02 product constraint), so the client never throws — it logs here.
--
-- line_link_codes — short-lived single-use codes that bind a LINE userId to a
--   logged-in customer. A customer (already authed in /me) requests a code; they
--   send it into the OA chat; the webhook redeems it. 10-min TTL mirrors the
--   login-intent nonce; consumed_at marks redemption (single use).
--
-- RLS is enabled with NO policies = deny-all on both, consistent with every
-- other app table. All access goes through the service-role client.
--
-- Apply via: Supabase Dashboard → SQL Editor, the Supabase MCP (apply_migration),
-- or `psql "<pooler connection string>" -f <this file>`. Idempotent.

begin;

create table if not exists public.line_message_log (
  id uuid primary key default gen_random_uuid(),
  -- LINE userId for pushes/inbound; a stable label (e.g. "reply") otherwise.
  recipient text not null,
  direction text not null check (direction in ('outbound', 'inbound')),
  -- Free-form purpose: 'link_confirm', 'welcome', 'booking_confirm', 'inbound', …
  kind text not null,
  status text not null check (
    status in ('sent', 'dropped', 'over_quota', 'failed', 'received')
  ),
  -- LINE message/webhook id, when known — the dedupe key for retried deliveries.
  line_message_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists line_message_log_recipient_idx
  on public.line_message_log (recipient);
create index if not exists line_message_log_created_at_idx
  on public.line_message_log (created_at);
-- Dedupe backstop: LINE may redeliver a webhook on timeout. A repeat insert of
-- the same id hits this and is swallowed by recordLineMessage (best-effort).
create unique index if not exists line_message_log_line_message_id_uq
  on public.line_message_log (line_message_id)
  where line_message_id is not null;

create table if not exists public.line_link_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint line_link_codes_code_key unique (code)
);

create index if not exists line_link_codes_customer_id_idx
  on public.line_link_codes (customer_id);

alter table public.line_message_log enable row level security;
alter table public.line_link_codes enable row level security;

comment on table public.line_message_log is
  'Audit/metering of LINE sends (incl. dropped/over_quota) and inbound webhook deliveries — keeps fail-silent pushes observable. RLS deny-all; service-role access only. line_message_id is the dedupe key for redelivered webhooks.';
comment on table public.line_link_codes is
  'Short-lived single-use codes binding a logged-in customer to a LINE userId via the OA chat. 10-min TTL; consumed_at marks redemption. RLS deny-all; service-role access only.';

commit;
