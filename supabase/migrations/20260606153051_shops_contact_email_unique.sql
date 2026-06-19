begin;

update shops
set owner_email = lower(owner_email)
where owner_email is not null
  and owner_email <> lower(owner_email);

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

create unique index if not exists shops_contact_phone_live_unique
  on shops (contact_phone)
  where status <> 'rejected' and contact_phone is not null;

create unique index if not exists shops_owner_email_live_unique
  on shops (lower(owner_email))
  where status <> 'rejected' and owner_email is not null;

commit;