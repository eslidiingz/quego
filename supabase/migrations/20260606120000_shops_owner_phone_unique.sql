-- Enforce one "live" shop per owner_phone at the database level.
--
-- owner_phone is the shop's login key (findApprovedShopByPhone); two live shops
-- on one phone make shop login ambiguous. The app already guards this in
-- createShop(), but this index is the authoritative, race-proof backstop —
-- concurrent registrations that slip past the app check fail with 23505, which
-- createShop() already maps to the "duplicate" result.
--
-- "Live" = any status except 'rejected', so a rejected applicant can re-apply
-- with the same phone. This mirrors the application rule exactly.
--
-- Apply via: Supabase Dashboard → SQL Editor (paste & Run), the Supabase MCP
-- (apply_migration), or `psql "<pooler connection string>" -f <this file>`.
-- Idempotent: safe to run more than once.

begin;

-- 1) Resolve existing duplicates so the unique index can be created.
--    Per phone, KEEP the most "established" live shop and auto-reject the rest:
--    prefer approved, then suspended, then pending; break ties by earliest
--    created_at. This guarantees an approved shop is never rejected in favour
--    of an older pending one. (Reversible: changes status only, deletes nothing.)
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

-- 2) The constraint itself: at most one non-rejected shop per phone.
create unique index if not exists shops_owner_phone_live_unique
  on shops (owner_phone)
  where status <> 'rejected';

commit;
