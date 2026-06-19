-- Enable RLS on every table (default deny)
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings    ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- profiles
-- =========================================================================
CREATE POLICY profiles_select_self_or_super ON profiles FOR SELECT
  USING (id = auth.uid() OR auth_user_role() = 'super_admin');

-- Self can update profile but NOT change role
CREATE POLICY profiles_update_self ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY profiles_update_super ON profiles FOR UPDATE
  USING (auth_user_role() = 'super_admin');

-- (INSERT is handled by the auth trigger; DELETE only via auth.users cascade)

-- =========================================================================
-- shops
-- =========================================================================
-- Public read so landing pages work without login
CREATE POLICY shops_select_public ON shops FOR SELECT
  USING (true);

CREATE POLICY shops_insert_super ON shops FOR INSERT
  WITH CHECK (auth_user_role() = 'super_admin');

CREATE POLICY shops_delete_super ON shops FOR DELETE
  USING (auth_user_role() = 'super_admin');

CREATE POLICY shops_update_super_or_admin ON shops FOR UPDATE
  USING (auth_user_role() = 'super_admin' OR is_shop_admin(id));

-- =========================================================================
-- shop_admins
-- =========================================================================
CREATE POLICY shop_admins_select ON shop_admins FOR SELECT
  USING (auth_user_role() = 'super_admin' OR user_id = auth.uid());

CREATE POLICY shop_admins_write_super ON shop_admins FOR ALL
  USING (auth_user_role() = 'super_admin')
  WITH CHECK (auth_user_role() = 'super_admin');

-- =========================================================================
-- slots
-- =========================================================================
-- Public read for the customer slot picker
CREATE POLICY slots_select_public ON slots FOR SELECT
  USING (true);

CREATE POLICY slots_write ON slots FOR ALL
  USING (auth_user_role() = 'super_admin' OR is_shop_admin(shop_id))
  WITH CHECK (auth_user_role() = 'super_admin' OR is_shop_admin(shop_id));

-- =========================================================================
-- bookings
-- =========================================================================
CREATE POLICY bookings_select ON bookings FOR SELECT
  USING (
    customer_id = auth.uid()
    OR is_shop_admin(shop_id)
    OR auth_user_role() = 'super_admin'
  );

-- Customer creates own booking; slot must be open + future, shop must be open.
CREATE POLICY bookings_insert_customer ON bookings FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM slots s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE s.id = bookings.slot_id
        AND s.status = 'open'
        AND s.starts_at > now()
        AND sh.is_open = true
    )
  );

-- Customer can cancel own booking up to 1h before slot.starts_at
CREATE POLICY bookings_update_customer_cancel ON bookings FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'cancelled'
    AND EXISTS (
      SELECT 1 FROM slots WHERE id = bookings.slot_id AND starts_at > now() + interval '1 hour'
    )
  );

-- Admin/super can mark complete / no_show / cancel
CREATE POLICY bookings_update_admin ON bookings FOR UPDATE
  USING (auth_user_role() = 'super_admin' OR is_shop_admin(shop_id));

CREATE POLICY bookings_delete_super ON bookings FOR DELETE
  USING (auth_user_role() = 'super_admin');
