-- Shop owners log in with phone + PIN. The PIN is set on first login (after
-- admin approval), then verified every subsequent login.
-- Format: scrypt$N$r$p$saltB64$keyB64 (same as admin password_hash).
alter table public.shops
  add column pin_hash text;

comment on column public.shops.pin_hash is
  'scrypt-hashed PIN (NULL until the shop owner sets it on first login).';
