-- Add an optional map pin (latitude/longitude) to shops.
--
-- Additive migration on top of the baseline (do not edit the baseline). Powers
-- the customer "นำทาง" (directions) deep link: the shop drops a precise pin once,
-- customers tap to open Google Maps and navigate there themselves — zero Maps
-- API cost. Nullable because legacy shops (and any that skip the picker) have no
-- pin and fall back to a text search on their address.

ALTER TABLE public.shops
  ADD COLUMN latitude  numeric(9, 6),  -- WGS84; 6 decimals ~= 0.11 m precision
  ADD COLUMN longitude numeric(9, 6);

ALTER TABLE public.shops
  ADD CONSTRAINT shops_lat_range
    CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  ADD CONSTRAINT shops_lng_range
    CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
  -- A pin is meaningless with only one axis; keep the pair all-or-nothing so the
  -- app can treat "has coordinates" as a single boolean.
  ADD CONSTRAINT shops_lat_lng_paired
    CHECK ((latitude IS NULL) = (longitude IS NULL));

COMMENT ON COLUMN public.shops.latitude IS
  'ละติจูดหมุดร้าน (WGS84). Nullable; ตั้งพร้อม longitude เท่านั้น. ใช้สร้างลิงก์นำทาง Google Maps.';
COMMENT ON COLUMN public.shops.longitude IS
  'ลองจิจูดหมุดร้าน (WGS84). Nullable; ตั้งพร้อม latitude เท่านั้น. ใช้สร้างลิงก์นำทาง Google Maps.';
