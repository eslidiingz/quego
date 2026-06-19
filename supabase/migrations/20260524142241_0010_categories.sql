-- Service categories — Phase 2 multi-shop discovery.
CREATE TABLE public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_key_idx ON public.categories (key);

ALTER TABLE public.shops
  ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX shops_category_id_idx ON public.shops (category_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.upsert_category_by_name(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trimmed text := nullif(btrim(coalesce(p_name, '')), '');
  v_key     text;
  v_id      uuid;
BEGIN
  IF v_trimmed IS NULL THEN
    RETURN NULL;
  END IF;

  v_key := lower(v_trimmed);

  SELECT id INTO v_id FROM public.categories WHERE key = v_key;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.categories (key, name)
  VALUES (v_key, v_trimmed)
  ON CONFLICT (key) DO UPDATE SET name = public.categories.name
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_category_by_name(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.upsert_category_by_name(text) TO authenticated;

INSERT INTO public.categories (key, name) VALUES
  ('บาร์เบอร์',      'บาร์เบอร์'),
  ('ร้านตัดผม',      'ร้านตัดผม'),
  ('ร้านนวด',        'ร้านนวด'),
  ('ร้านเสริมสวย',   'ร้านเสริมสวย'),
  ('สปา',           'สปา')
ON CONFLICT (key) DO NOTHING;

UPDATE public.shops
   SET category_id = (SELECT id FROM public.categories WHERE key = 'บาร์เบอร์')
 WHERE slug = 'nick-barber'
   AND category_id IS NULL;