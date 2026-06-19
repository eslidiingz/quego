-- OPP-15 loyalty points (informational, no payment rail) + referral attribution.

-- referrals first (loyalty_ledger.referral_id references it)
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_phone text not null check (referrer_phone ~ '^[0-9]{9,10}$'),
  referee_phone text not null check (referee_phone ~ '^[0-9]{9,10}$'),
  referral_code text not null,
  status text not null default 'held' check (status in ('held','released','void')),
  hold_until timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referrals_no_self check (referrer_phone <> referee_phone)
);
create unique index if not exists referrals_referee_uniq on public.referrals (referee_phone);
create index if not exists referrals_referrer_idx on public.referrals (referrer_phone);
create index if not exists referrals_release_idx on public.referrals (status, hold_until);
alter table public.referrals enable row level security;
comment on table public.referrals is
  'OPP-15 referral attribution: one row per referred new customer (referee_phone unique). status held -> released after a 3-day anti-abuse hold once the referee has a completed booking. RLS deny-all; service-role only.';

create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null check (customer_phone ~ '^[0-9]{9,10}$'),
  kind text not null check (kind in ('earn','referral','adjust')),
  amount integer not null,
  booking_id uuid references public.bookings(id) on delete set null,
  referral_id uuid references public.referrals(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
-- idempotent accrual: at most one 'earn' row per completed booking
create unique index if not exists loyalty_ledger_booking_kind_uniq
  on public.loyalty_ledger (booking_id, kind) where booking_id is not null;
-- idempotent referral reward: at most one ledger row per referral
create unique index if not exists loyalty_ledger_referral_uniq
  on public.loyalty_ledger (referral_id) where referral_id is not null;
create index if not exists loyalty_ledger_phone_idx
  on public.loyalty_ledger (customer_phone, created_at desc);
alter table public.loyalty_ledger enable row level security;
comment on table public.loyalty_ledger is
  'OPP-15 informational loyalty points (no payment rail). Append-only; balance = SUM(amount) per customer_phone. kind: earn (completed booking, idempotent via unique(booking_id,kind)) | referral (released reward, idempotent via unique(referral_id)) | adjust. RLS deny-all; service-role only.';

-- stable per-customer referral code (generated lazily by the loyalty service)
alter table public.customers add column if not exists referral_code text;
create unique index if not exists customers_referral_code_uniq
  on public.customers (referral_code) where referral_code is not null;
comment on column public.customers.referral_code is
  'OPP-15 stable per-customer referral code (generated lazily on first /me/credit view/share). Nullable; partial-unique on non-null. Attributes a new customer (referee) to this referrer at PIN setup.';