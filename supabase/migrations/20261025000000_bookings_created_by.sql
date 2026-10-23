-- H1 / M6: record who created each booking so per-phone caps can count only
-- customer-originated rows, and the per-shop hourly cap only shop-made ones.
-- Legacy rows stay NULL and are ignored by both caps (they only look at
-- upcoming bookings and the last 24h, so NULL ages out within days).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS created_by text
  CONSTRAINT bookings_created_by_check
    CHECK (created_by IS NULL OR created_by = ANY (ARRAY['customer'::text, 'shop'::text, 'walk_in'::text]));

COMMENT ON COLUMN public.bookings.created_by IS
  'Who created the booking: ''customer'' (public booking form), ''walk_in'' (in-shop QR), ''shop'' (owner manual entry). NULL for rows created before 2026-10-25. Drives the per-phone booking caps and the per-shop manual-booking rate cap.';

-- Per-phone cap lookups: this phone's upcoming / recent customer-made rows.
CREATE INDEX IF NOT EXISTS bookings_phone_created_at_idx
  ON public.bookings USING btree (customer_phone, created_at)
  WHERE customer_phone IS NOT NULL;

-- Per-shop hourly cap on shop-made bookings.
CREATE INDEX IF NOT EXISTS bookings_shop_made_created_at_idx
  ON public.bookings USING btree (shop_id, created_at)
  WHERE created_by = 'shop';
