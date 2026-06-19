-- End-user customer accounts. Anonymous booking still works (bookings
-- doesn't FK to this table); the customer row exists only so a returning
-- caller can authenticate by PIN and see their own queue history. Linkage
-- back to historical bookings is by phone number, not by id.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null
    check (phone ~ '^[0-9]{9,10}$'),
  -- Null until the first successful PIN setup. Customers cannot log in
  -- until this is set.
  pin_hash text,
  name text check (name is null or length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;
-- No policies: deny-all for anon/authenticated. Service role bypasses.

create or replace function public.tg_customers_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

revoke all on function public.tg_customers_set_updated_at() from public;
revoke all on function public.tg_customers_set_updated_at() from anon;
revoke all on function public.tg_customers_set_updated_at() from authenticated;

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.tg_customers_set_updated_at();