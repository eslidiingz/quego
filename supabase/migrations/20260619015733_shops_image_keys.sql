ALTER TABLE public.shops
  ADD COLUMN logo_key  text NULL,
  ADD COLUMN cover_key text NULL;

COMMENT ON COLUMN public.shops.logo_key  IS 'R2 object key for the shop avatar/logo (1:1, ~512px PNG). NULL = no logo; app renders category-icon fallback. Public URL derived from NEXT_PUBLIC_R2_PUBLIC_BASE_URL. Written only by the service layer.';
COMMENT ON COLUMN public.shops.cover_key IS 'R2 object key for the shop cover/banner (~8:3, ~1600x600 JPEG). NULL = no cover; app renders bg-luxury-gradient fallback. Written only by the service layer.';

ALTER TABLE public.shops
  ADD CONSTRAINT shops_logo_key_fmt  CHECK (logo_key  IS NULL OR (char_length(logo_key)  <= 256 AND logo_key  LIKE 'shops/%')),
  ADD CONSTRAINT shops_cover_key_fmt CHECK (cover_key IS NULL OR (char_length(cover_key) <= 256 AND cover_key LIKE 'shops/%'));