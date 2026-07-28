-- Onboarding state for the shop-owner guided tour + "เปิดร้าน" activation checklist.
--
-- Additive migration on top of the baseline (do not edit the baseline). Two
-- nullable timestamps on `shops` — both are "has the owner done this yet?" facts
-- that cannot be derived from any existing row:
--
--   tour_seen_at        The guided tour auto-runs once, on the owner's first
--                       visit to /shop. Stamped when they finish OR skip it, so
--                       it never auto-runs again (the ? button on each page
--                       replays it on demand). Stored per shop rather than in
--                       localStorage for three reasons: the `(authed)` layout is
--                       already `force-dynamic`, so it can decide server-side and
--                       never flash the overlay at a returning owner; the flag
--                       survives the owner moving between their phone and the
--                       shop tablet (/shop/display runs on a second device); and
--                       the repo has no client-persistence layer to hang it on
--                       (localStorage is used in exactly one place, ThemeToggle).
--   share_kit_acked_at  The single activation step the system cannot verify —
--                       "เอา QR ไปติดหน้าร้าน / วางลิงก์ใน Google Business Profile".
--                       It cannot be inferred from bookings either: `bookings`
--                       has no source/created_by column, so a shop entering its
--                       own walk-in would falsely satisfy it. The owner ticks it.
--
-- Both nullable with no default, so every existing shop reads as "never done" —
-- the correct starting state for the checklist. Timestamps rather than booleans
-- so activation funnels can be measured later without another migration.
-- `tour_seen_at` is only ever written while it IS NULL, so it keeps meaning
-- "first seen" even after the owner replays the tour.

ALTER TABLE public.shops
  ADD COLUMN tour_seen_at       timestamptz,
  ADD COLUMN share_kit_acked_at timestamptz;

COMMENT ON COLUMN public.shops.tour_seen_at IS
  'เวลาที่เจ้าของร้านดูจบหรือข้ามทัวร์แนะนำการใช้งานครั้งแรก. NULL = ยังไม่เคยดู (ระบบจะเปิดทัวร์ให้อัตโนมัติที่หน้า /shop). ไม่บันทึกเมื่อผู้ดูแลระบบเข้าใช้ในนามร้าน (impersonation).';

COMMENT ON COLUMN public.shops.share_kit_acked_at IS
  'เวลาที่เจ้าของร้านยืนยันว่านำ QR/ลิงก์ไปติดหน้าร้านและวางไว้ใน Google Business Profile แล้ว. NULL = ยังไม่ยืนยัน. เป็นขั้นตอนเดียวใน checklist เปิดร้านที่ระบบตรวจสอบเองไม่ได้.';
