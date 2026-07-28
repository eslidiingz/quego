-- Drop `shops.share_kit_acked_at` — the manual "เอา QR ไปติดหน้าร้าน / วางลิงก์ใน
-- Google Business Profile" step is no longer part of the activation checklist.
--
-- Rationale: every remaining checklist step is provable from the data (services,
-- business hours, location pin, logo, active staff). This one was the sole
-- exception — an owner-ticked flag for work done outside the app — so a shop
-- that was fully configured still read as "ยังไม่ครบ" until someone remembered
-- to tick a box. Putting the QR up and pasting the link into Google Business
-- Profile is still worth doing; it lives on /shop/share as a suggestion instead
-- of as a gate on "the shop is open".
--
-- Safe to drop: no rows carried a value (checked before writing this migration),
-- and `20260726000000_add_shop_onboarding_state.sql` — which added it — is left
-- untouched as the historical record. `tour_seen_at`, added by that same
-- migration, is still in use by the guided tour and is deliberately kept.

ALTER TABLE public.shops
  DROP COLUMN IF EXISTS share_kit_acked_at;
