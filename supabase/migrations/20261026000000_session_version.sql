-- Audit M7: revocable sessions. Each identity table carries a session_version
-- that is embedded in the session JWT (claim "sv") and re-checked against the
-- DB on every server-side session read. Changing a PIN / password bumps the
-- version in a BEFORE UPDATE trigger (atomic, covers every write path), which
-- invalidates every other session for that identity.

alter table public.admins add column if not exists session_version integer not null default 1;
alter table public.shops add column if not exists session_version integer not null default 1;
alter table public.customers add column if not exists session_version integer not null default 1;

create or replace function public.bump_session_version_on_pin_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pin_hash is distinct from old.pin_hash and old.pin_hash is not null then
    new.session_version := old.session_version + 1;
  end if;
  return new;
end;
$$;

create or replace function public.bump_session_version_on_password_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.password_hash is distinct from old.password_hash then
    new.session_version := old.session_version + 1;
  end if;
  return new;
end;
$$;

revoke execute on function public.bump_session_version_on_pin_change() from public, anon, authenticated;
revoke execute on function public.bump_session_version_on_password_change() from public, anon, authenticated;

drop trigger if exists shops_bump_session_version on public.shops;
create trigger shops_bump_session_version
  before update of pin_hash on public.shops
  for each row execute function public.bump_session_version_on_pin_change();

drop trigger if exists customers_bump_session_version on public.customers;
create trigger customers_bump_session_version
  before update of pin_hash on public.customers
  for each row execute function public.bump_session_version_on_pin_change();

drop trigger if exists admins_bump_session_version on public.admins;
create trigger admins_bump_session_version
  before update of password_hash on public.admins
  for each row execute function public.bump_session_version_on_password_change();
