alter table public.customers add column if not exists phone_verified_at timestamptz;
comment on column public.customers.phone_verified_at is 'When the customer proved phone ownership via Firebase OTP at signup (first PIN setup). Null = legacy/unverified.';

alter table public.shops add column if not exists phone_verified_at timestamptz;
comment on column public.shops.phone_verified_at is 'When the shop owner proved phone ownership via Firebase OTP at registration. Null = legacy/unverified.';