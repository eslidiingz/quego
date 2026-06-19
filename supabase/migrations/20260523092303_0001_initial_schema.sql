-- Enums
CREATE TYPE user_role      AS ENUM ('customer', 'shop_admin', 'super_admin');
CREATE TYPE slot_status    AS ENUM ('open', 'blocked');
CREATE TYPE booking_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');

-- profiles
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone         text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  role          user_role NOT NULL DEFAULT 'customer',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN profiles.phone IS 'E.164 normalized phone; mirrors auth.users.phone';

-- shops
CREATE TABLE shops (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   text NOT NULL UNIQUE,
  name                   text NOT NULL,
  description            text,
  address                text,
  phone                  text,
  hours_text             text,
  is_open                boolean NOT NULL DEFAULT true,
  slot_duration_minutes  integer NOT NULL DEFAULT 30 CHECK (slot_duration_minutes BETWEEN 5 AND 240),
  timezone               text NOT NULL DEFAULT 'Asia/Bangkok',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shops_slug_idx ON shops (slug);

-- shop_admins (M:N profiles <-> shops)
CREATE TABLE shop_admins (
  shop_id     uuid NOT NULL REFERENCES shops(id)    ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, user_id)
);
CREATE INDEX shop_admins_user_idx ON shop_admins (user_id);

-- slots
CREATE TABLE slots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  starts_at         timestamptz NOT NULL,
  duration_minutes  integer NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 240),
  status            slot_status NOT NULL DEFAULT 'open',
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, starts_at)
);
CREATE INDEX slots_shop_starts_idx ON slots (shop_id, starts_at);
CREATE INDEX slots_starts_open_idx ON slots (starts_at) WHERE status = 'open';

-- bookings
CREATE TABLE bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       uuid NOT NULL REFERENCES slots(id)    ON DELETE RESTRICT,
  shop_id       uuid NOT NULL REFERENCES shops(id)    ON DELETE RESTRICT,
  customer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status        booking_status NOT NULL DEFAULT 'confirmed',
  notes         text,
  ref_code      text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  cancelled_at  timestamptz,
  completed_at  timestamptz
);

-- INVARIANT 1: one active booking per slot (prevents double-booking under race)
CREATE UNIQUE INDEX bookings_slot_active_uniq
  ON bookings (slot_id)
  WHERE status IN ('confirmed', 'completed', 'no_show');

-- INVARIANT 2: one active future booking per customer per shop
CREATE UNIQUE INDEX bookings_customer_active_per_shop_uniq
  ON bookings (customer_id, shop_id)
  WHERE status = 'confirmed';

-- Hot-path indexes
CREATE INDEX bookings_customer_idx     ON bookings (customer_id, created_at DESC);
CREATE INDEX bookings_shop_status_idx  ON bookings (shop_id, status);
