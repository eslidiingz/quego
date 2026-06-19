-- Helper: returns current user's app role (used in RLS)
-- Note: avoids the Postgres built-in `current_role`.
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper: is the current user an admin of the given shop?
CREATE OR REPLACE FUNCTION is_shop_admin(shop uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_admins
    WHERE shop_id = shop AND user_id = auth.uid()
  );
$$;

-- Auto-create profile when Supabase Auth inserts a new user
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, display_name, role)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.phone),
    'customer'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER shops_touch BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Booking ref code generator (4-char, omits 0/O/1/I for readability)
CREATE OR REPLACE FUNCTION generate_ref_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 32 chars
  result text := '';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION bookings_set_ref_code()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  attempt int := 0;
BEGIN
  IF NEW.ref_code IS NULL OR NEW.ref_code = '' THEN
    LOOP
      NEW.ref_code := generate_ref_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE ref_code = NEW.ref_code);
      attempt := attempt + 1;
      IF attempt > 5 THEN
        RAISE EXCEPTION 'Could not generate unique ref_code after 5 attempts';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_set_ref_code_trg
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_set_ref_code();

-- Denormalized bookings.shop_id is filled from slots.shop_id automatically.
-- Clients don't need to set it; trigger overwrites any provided value.
CREATE OR REPLACE FUNCTION bookings_sync_shop_id()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  s_shop uuid;
BEGIN
  SELECT shop_id INTO s_shop FROM slots WHERE id = NEW.slot_id;
  IF s_shop IS NULL THEN
    RAISE EXCEPTION 'Slot % not found', NEW.slot_id;
  END IF;
  NEW.shop_id := s_shop;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_sync_shop_id_trg
  BEFORE INSERT OR UPDATE OF slot_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_sync_shop_id();
