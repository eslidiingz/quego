-- Shop notifications can target a LINE group (staff group) instead of the
-- owner's personal LINE. One group binds to at most one shop; the partial
-- unique index mirrors the shops.line_user_id backstop (23505 on conflict).
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS line_group_id text;

CREATE UNIQUE INDEX IF NOT EXISTS shops_line_group_id_key
  ON public.shops (line_group_id)
  WHERE line_group_id IS NOT NULL;