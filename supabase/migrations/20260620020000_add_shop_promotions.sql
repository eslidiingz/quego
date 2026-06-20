-- Shop promotions (โปรโมชั่นของร้าน) — first type: a stamp card (บัตรสะสมแต้ม):
-- "ใช้บริการครบ N ครั้ง รับสิทธิ์ <reward>" (e.g. ครบ 10 ครั้ง รับตัดผมฟรี 1 ครั้ง).
--
--   shop_promotions  — the rule a shop defines (one row per promotion).
--   promotion_stamps — append-only stamp ledger; a customer's balance for one
--     promotion is SUM(amount) of their rows. kind:
--       earn   (+1 per completed booking; idempotent via unique(promotion_id, booking_id))
--       redeem (−required_stamps when the shop grants the reward)
--       adjust (manual correction).
--
-- Phone is the customer identity key (mirrors bookings/loyalty_ledger); money-free.
-- Mirrors existing conventions: uuid PK, shop_id FK ON DELETE CASCADE, updated_at
-- trigger on the definitions table (the ledger is append-only, so it has only
-- created_at), RLS deny-all (all access via the service-role client in the
-- service layer).

CREATE TABLE public.shop_promotions (
  id              uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id         uuid NOT NULL,
  type            text DEFAULT 'stamp_card' NOT NULL,
  title           text NOT NULL,
  description     text,
  required_stamps integer NOT NULL,
  reward          text NOT NULL,
  is_active       boolean DEFAULT true NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_promotions_pkey PRIMARY KEY (id),
  CONSTRAINT shop_promotions_type_check CHECK (type IN ('stamp_card')),
  CONSTRAINT shop_promotions_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT shop_promotions_description_check CHECK (description IS NULL OR char_length(description) <= 500),
  CONSTRAINT shop_promotions_reward_check CHECK (char_length(btrim(reward)) BETWEEN 1 AND 120),
  CONSTRAINT shop_promotions_required_stamps_check CHECK (required_stamps BETWEEN 1 AND 100),
  CONSTRAINT shop_promotions_shop_id_fkey FOREIGN KEY (shop_id)
    REFERENCES public.shops(id) ON DELETE CASCADE
);

CREATE INDEX shop_promotions_shop_idx
  ON public.shop_promotions USING btree (shop_id, created_at DESC);

CREATE TRIGGER shop_promotions_set_updated_at
  BEFORE UPDATE ON public.shop_promotions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.shop_promotions ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.promotion_stamps (
  id             uuid DEFAULT gen_random_uuid() NOT NULL,
  promotion_id   uuid NOT NULL,
  shop_id        uuid NOT NULL,
  customer_phone text NOT NULL,
  kind           text DEFAULT 'earn' NOT NULL,
  amount         integer NOT NULL,
  booking_id     uuid,
  note           text,
  created_at     timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT promotion_stamps_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_stamps_kind_check CHECK (kind IN ('earn', 'redeem', 'adjust')),
  CONSTRAINT promotion_stamps_note_check CHECK (note IS NULL OR char_length(note) <= 200),
  CONSTRAINT promotion_stamps_promotion_id_fkey FOREIGN KEY (promotion_id)
    REFERENCES public.shop_promotions(id) ON DELETE CASCADE,
  CONSTRAINT promotion_stamps_shop_id_fkey FOREIGN KEY (shop_id)
    REFERENCES public.shops(id) ON DELETE CASCADE,
  CONSTRAINT promotion_stamps_booking_id_fkey FOREIGN KEY (booking_id)
    REFERENCES public.bookings(id) ON DELETE SET NULL
);

-- One earn stamp per (promotion, booking): makes accrual idempotent when a
-- booking is toggled completed more than once (Postgres 23505 → no-op).
CREATE UNIQUE INDEX promotion_stamps_promotion_booking_uidx
  ON public.promotion_stamps USING btree (promotion_id, booking_id)
  WHERE booking_id IS NOT NULL;

-- Fast progress reads: a customer's balance within one promotion.
CREATE INDEX promotion_stamps_progress_idx
  ON public.promotion_stamps USING btree (promotion_id, customer_phone);

-- Fast shop-scoped reads: the participants list across a shop's promotions.
CREATE INDEX promotion_stamps_shop_phone_idx
  ON public.promotion_stamps USING btree (shop_id, customer_phone);

ALTER TABLE public.promotion_stamps ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.shop_promotions IS
  'Shop promotions (โปรโมชั่นของร้าน). First type stamp_card (บัตรสะสมแต้ม): ใช้บริการครบ required_stamps ครั้ง รับสิทธิ์ reward. RLS deny-all; service-role only.';
COMMENT ON TABLE public.promotion_stamps IS
  'Append-only stamp ledger for shop_promotions. Balance = SUM(amount) per (promotion_id, customer_phone). kind: earn (+1 per completed booking, idempotent via unique(promotion_id, booking_id)) | redeem (−required_stamps) | adjust. Phone is the customer identity key. RLS deny-all; service-role only.';
