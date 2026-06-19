-- =========================================================================
-- Part 1: pin search_path on the 4 functions that previously didn't.
-- Prevents search_path hijacking by a privileged caller setting a malicious
-- temp schema higher in the resolution order.
-- =========================================================================
ALTER FUNCTION public.touch_updated_at()         SET search_path = '';
ALTER FUNCTION public.generate_ref_code()        SET search_path = '';
ALTER FUNCTION public.bookings_set_ref_code()    SET search_path = '';
ALTER FUNCTION public.bookings_sync_shop_id()    SET search_path = '';

-- bookings_sync_shop_id references `slots` (now unqualified) and must
-- qualify the table when search_path is empty.
CREATE OR REPLACE FUNCTION public.bookings_sync_shop_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  s_shop uuid;
BEGIN
  SELECT shop_id INTO s_shop FROM public.slots WHERE id = NEW.slot_id;
  IF s_shop IS NULL THEN
    RAISE EXCEPTION 'Slot % not found', NEW.slot_id;
  END IF;
  NEW.shop_id := s_shop;
  RETURN NEW;
END;
$$;

-- bookings_set_ref_code references `bookings` and `generate_ref_code`
-- which must be qualified now.
CREATE OR REPLACE FUNCTION public.bookings_set_ref_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  attempt int := 0;
BEGIN
  IF NEW.ref_code IS NULL OR NEW.ref_code = '' THEN
    LOOP
      NEW.ref_code := public.generate_ref_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE ref_code = NEW.ref_code);
      attempt := attempt + 1;
      IF attempt > 5 THEN
        RAISE EXCEPTION 'Could not generate unique ref_code after 5 attempts';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================================
-- Part 2: move SECURITY DEFINER helpers to a private schema so PostgREST
-- doesn't expose them at /rest/v1/rpc/*. RLS policies in public can still
-- call them by qualified name.
-- =========================================================================
CREATE SCHEMA IF NOT EXISTS internal;

-- internal.auth_user_role
CREATE OR REPLACE FUNCTION internal.auth_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- internal.is_shop_admin
CREATE OR REPLACE FUNCTION internal.is_shop_admin(shop uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_admins
    WHERE shop_id = shop AND user_id = auth.uid()
  );
$$;

-- Allow authenticated + anon to call them (so RLS in public can evaluate);
-- they live in `internal` so they are NOT exposed via PostgREST RPC.
GRANT USAGE ON SCHEMA internal TO authenticated, anon;
GRANT EXECUTE ON FUNCTION internal.auth_user_role()      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION internal.is_shop_admin(uuid)   TO authenticated, anon;

-- Rewrite policies to use internal.* (DROP + CREATE because Postgres can't
-- change a policy's USING/WITH CHECK expression in place).

-- profiles
DROP POLICY IF EXISTS profiles_select_self_or_super ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self          ON public.profiles;
DROP POLICY IF EXISTS profiles_update_super         ON public.profiles;

CREATE POLICY profiles_select_self_or_super ON public.profiles FOR SELECT
  USING (id = auth.uid() OR internal.auth_user_role() = 'super_admin');

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY profiles_update_super ON public.profiles FOR UPDATE
  USING (internal.auth_user_role() = 'super_admin');

-- shops
DROP POLICY IF EXISTS shops_insert_super         ON public.shops;
DROP POLICY IF EXISTS shops_delete_super         ON public.shops;
DROP POLICY IF EXISTS shops_update_super_or_admin ON public.shops;

CREATE POLICY shops_insert_super ON public.shops FOR INSERT
  WITH CHECK (internal.auth_user_role() = 'super_admin');

CREATE POLICY shops_delete_super ON public.shops FOR DELETE
  USING (internal.auth_user_role() = 'super_admin');

CREATE POLICY shops_update_super_or_admin ON public.shops FOR UPDATE
  USING (internal.auth_user_role() = 'super_admin' OR internal.is_shop_admin(id));

-- shop_admins
DROP POLICY IF EXISTS shop_admins_select       ON public.shop_admins;
DROP POLICY IF EXISTS shop_admins_write_super  ON public.shop_admins;

CREATE POLICY shop_admins_select ON public.shop_admins FOR SELECT
  USING (internal.auth_user_role() = 'super_admin' OR user_id = auth.uid());

CREATE POLICY shop_admins_write_super ON public.shop_admins FOR ALL
  USING (internal.auth_user_role() = 'super_admin')
  WITH CHECK (internal.auth_user_role() = 'super_admin');

-- slots
DROP POLICY IF EXISTS slots_write ON public.slots;

CREATE POLICY slots_write ON public.slots FOR ALL
  USING (internal.auth_user_role() = 'super_admin' OR internal.is_shop_admin(shop_id))
  WITH CHECK (internal.auth_user_role() = 'super_admin' OR internal.is_shop_admin(shop_id));

-- bookings
DROP POLICY IF EXISTS bookings_select                   ON public.bookings;
DROP POLICY IF EXISTS bookings_update_admin             ON public.bookings;
DROP POLICY IF EXISTS bookings_delete_super             ON public.bookings;

CREATE POLICY bookings_select ON public.bookings FOR SELECT
  USING (
    customer_id = auth.uid()
    OR internal.is_shop_admin(shop_id)
    OR internal.auth_user_role() = 'super_admin'
  );

CREATE POLICY bookings_update_admin ON public.bookings FOR UPDATE
  USING (internal.auth_user_role() = 'super_admin' OR internal.is_shop_admin(shop_id));

CREATE POLICY bookings_delete_super ON public.bookings FOR DELETE
  USING (internal.auth_user_role() = 'super_admin');

-- Drop the old public-schema versions now that nothing references them
DROP FUNCTION IF EXISTS public.auth_user_role();
DROP FUNCTION IF EXISTS public.is_shop_admin(uuid);

-- =========================================================================
-- Part 3: handle_new_auth_user is only called by the trigger; lock it down
-- so anonymous and authenticated users cannot call it via RPC.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM public, anon, authenticated;
