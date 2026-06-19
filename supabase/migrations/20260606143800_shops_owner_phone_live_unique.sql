begin;

with ranked as (
  select
    id,
    row_number() over (
      partition by owner_phone
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
  where status <> 'rejected'
)
update shops s
set
  status = 'rejected',
  rejection_reason = coalesce(
    s.rejection_reason,
    'ปิดอัตโนมัติ: เบอร์โทรนี้ถูกใช้กับร้านอื่นในระบบแล้ว'
  ),
  reviewed_at = now()
from ranked r
where s.id = r.id
  and r.rn > 1;

create unique index if not exists shops_owner_phone_live_unique
  on shops (owner_phone)
  where status <> 'rejected';

commit;