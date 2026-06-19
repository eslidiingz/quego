ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS subdistrict text;

COMMENT ON COLUMN public.shops.subdistrict IS 'Thai sub-district/แขวง/ตำบล (canonical name belonging to district). Nullable for legacy rows; required by the shop form.';

DROP INDEX IF EXISTS shops_province_district_idx;
CREATE INDEX IF NOT EXISTS shops_location_idx ON public.shops (province, district, subdistrict);