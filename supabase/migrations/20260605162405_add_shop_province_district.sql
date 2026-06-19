ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS district text;

COMMENT ON COLUMN public.shops.province IS 'Thai province (จังหวัด), canonical name from src/lib/location/thailand.ts. Nullable for legacy rows; required by the shop form. Filtered by exact-equality on the discovery page.';
COMMENT ON COLUMN public.shops.district IS 'Thai district/เขต/อำเภอ (canonical name belonging to province). Nullable for legacy rows; required by the shop form.';

CREATE INDEX IF NOT EXISTS shops_province_district_idx ON public.shops (province, district);