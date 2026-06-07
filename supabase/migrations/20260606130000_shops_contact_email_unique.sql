-- Enforce one "live" shop per contact_phone and per owner_email.
--
-- Mirrors shops_owner_phone_live_unique: owner_phone is the login key, but a
-- shop phone (contact_phone) and an owner email must ALSO be unique so the same
-- number/email can't be claimed by two shops. createShop() already guards this
-- at the app level; these partial unique indexes are the authoritative,
-- race-proof backstop — concurrent registrations that slip past the app check
-- fail with 23505, which createShop() maps back to the offending field.
--
-- Scope notes:
--   * Both columns are NULLABLE and optional on the form, so the indexes are
--     partial: they only constrain non-null values of live (non-rejected) shops.
--     Any number of rows may leave these blank.
--   * "Live" = any status except 'rejected', so a rejected applicant can
--     re-apply with the same phone/email. Mirrors the application rule exactly.
--   * owner_email is matched case-insensitively (lower()) — "A@x.com" and
--     "a@x.com" are the same mailbox. createShop() lowercases before insert, so
--     the stored value and this index agree.
--
-- Apply via: Supabase Dashboard → SQL Editor, the Supabase MCP (apply_migration),
-- or `psql "<pooler connection string>" -f <this file>`. Idempotent.

begin;

-- 0) Normalise existing emails to lowercase so the case-insensitive index and
--    the app's lowercased writes operate on consistent data.
update shops
set owner_email = lower(owner_email)
where owner_email is not null
  and owner_email <> lower(owner_email);

-- 1) Resolve any existing contact_phone duplicates among live shops by NULLing
--    the optional field on all but the most "established" shop (approved >
--    suspended > pending, then earliest created). Least-destructive: clears an
--    optional field rather than rejecting an otherwise-valid shop. (No-op today
--    — there are currently no live duplicates — but keeps the migration safe to
--    run against any data.)
with ranked as (
  select
    id,
    row_number() over (
      partition by contact_phone
      order by
        case status
          when 'approved' then 0
          when 'suspended' then 1
          when 'pending' then 2
          else 3
        end asc,
        created_at asc,
        id asc
    ) as rn
  from shops
  where status <> 'rejected' and contact_phone is not null
)
update shops s
set contact_phone = null
from ranked r
where s.id = r.id and r.rn > 1;

-- 2) Same treatment for owner_email (case-insensitive partition).
with ranked as (
  select
    id,
    row_number() over (
      partition by lower(owner_email)
      order by
        case status
          when 'approved' then 0
          when 'suspended' then 1
          when 'pending' then 2
          else 3
        end asc,
        created_at asc,
        id asc
    ) as rn
  from shops
  where status <> 'rejected' and owner_email is not null
)
update shops s
set owner_email = null
from ranked r
where s.id = r.id and r.rn > 1;

-- 3) The constraints: at most one live shop per non-null contact_phone / email.
create unique index if not exists shops_contact_phone_live_unique
  on shops (contact_phone)
  where status <> 'rejected' and contact_phone is not null;

create unique index if not exists shops_owner_email_live_unique
  on shops (lower(owner_email))
  where status <> 'rejected' and owner_email is not null;

commit;
