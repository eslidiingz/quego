-- SEC-01 (HIGH): brute-force lockout state for PIN/password auth.
-- 6-digit PINs have only 1e6 candidates; without a lockout an attacker can
-- guess offline-cracked or online. Track failed attempts + a temporary lock.
alter table public.shops     add column if not exists failed_pin_attempts int not null default 0;
alter table public.shops     add column if not exists locked_until timestamptz;
alter table public.customers add column if not exists failed_pin_attempts int not null default 0;
alter table public.customers add column if not exists locked_until timestamptz;
alter table public.admins    add column if not exists failed_login_attempts int not null default 0;
alter table public.admins    add column if not exists locked_until timestamptz;