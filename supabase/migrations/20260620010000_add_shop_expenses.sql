-- Shop expenses (ค่าใช้จ่ายของร้าน): one-off expense entries a shop records,
-- aggregated into net profit on the report (รายงานร้าน). Category is free TEXT
-- (preset suggestions + custom). Mirrors the shop_services conventions:
-- uuid PK, shop_id FK ON DELETE CASCADE, numeric(10,2) money, updated_at trigger,
-- RLS deny-all (all access via the service-role client in the service layer).

CREATE TABLE public.shop_expenses (
  id           uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id      uuid NOT NULL,
  category     text NOT NULL,
  amount       numeric(10,2) NOT NULL,
  expense_date date NOT NULL,
  note         text,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  updated_at   timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT shop_expenses_amount_check CHECK (amount >= 0),
  CONSTRAINT shop_expenses_category_check CHECK (char_length(btrim(category)) BETWEEN 1 AND 80),
  CONSTRAINT shop_expenses_note_check CHECK (note IS NULL OR char_length(note) <= 500),
  CONSTRAINT shop_expenses_shop_id_fkey FOREIGN KEY (shop_id)
    REFERENCES public.shops(id) ON DELETE CASCADE
);

CREATE INDEX shop_expenses_shop_idx
  ON public.shop_expenses USING btree (shop_id, expense_date DESC);

CREATE TRIGGER shop_expenses_set_updated_at
  BEFORE UPDATE ON public.shop_expenses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.shop_expenses ENABLE ROW LEVEL SECURITY;
