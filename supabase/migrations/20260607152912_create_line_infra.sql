begin;

create table if not exists public.line_message_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  direction text not null check (direction in ('outbound', 'inbound')),
  kind text not null,
  status text not null check (
    status in ('sent', 'dropped', 'over_quota', 'failed', 'received')
  ),
  line_message_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists line_message_log_recipient_idx
  on public.line_message_log (recipient);
create index if not exists line_message_log_created_at_idx
  on public.line_message_log (created_at);
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