-- OPP-05: customer waitlist for a fully-booked (shop, service, date).
-- When a confirmed booking is cancelled/rescheduled-away, the freed capacity is
-- auto-offered over LINE to the oldest eligible waitlister (re-verified against
-- live slot availability). Phone is the identity key (mirrors bookings/reviews).
-- RLS deny-all; service-role access only.
CREATE TABLE public.waitlist_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_id          uuid NOT NULL REFERENCES public.shop_services(id) ON DELETE CASCADE,
  service_name        text NOT NULL CHECK (length(btrim(service_name)) BETWEEN 1 AND 120),
  preferred_staff_id  uuid REFERENCES public.shop_staff(id) ON DELETE SET NULL,
  requested_date      date NOT NULL,
  customer_phone      text NOT NULL CHECK (customer_phone ~ '^[0-9]{9,10}$'),
  customer_name       text NOT NULL CHECK (length(btrim(customer_name)) BETWEEN 1 AND 100),
  status              text NOT NULL DEFAULT 'waiting'
                        CHECK (status = ANY (ARRAY['waiting','notified','fulfilled','cancelled'])),
  notified_at         timestamptz,
  fulfilled_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.waitlist_entries IS
  'OPP-05 waitlist: a customer asks to be notified when a slot opens for a fully-booked (shop_id, service_id, requested_date). Optional preferred_staff_id (NULL = any staff). status: waiting -> notified (LINE push sent, head-start to book) -> fulfilled (they booked) | cancelled (left the list). Phone is the identity key. RLS deny-all; service-role only.';
COMMENT ON COLUMN public.waitlist_entries.service_name IS 'Snapshot of the service name at join time (survives rename/delete), used in the LINE push.';
COMMENT ON COLUMN public.waitlist_entries.preferred_staff_id IS 'Optional preferred staff (NULL = any staff). Availability re-check honours this preference.';
COMMENT ON COLUMN public.waitlist_entries.notified_at IS 'When the LINE "a slot opened" push was last sent. Gates roll-on re-notification (claim window).';

-- One active entry per (shop, service, date, phone). A duplicate join attempt
-- raises 23505 which the service treats as "already on the list".
CREATE UNIQUE INDEX waitlist_entries_active_uniq
  ON public.waitlist_entries (shop_id, service_id, requested_date, customer_phone)
  WHERE status IN ('waiting','notified');

-- Offer selection: oldest eligible entry for a freed (shop, date).
CREATE INDEX waitlist_entries_offer_idx
  ON public.waitlist_entries (shop_id, requested_date, status, created_at);

-- Customer "my waitlist" view.
CREATE INDEX waitlist_entries_phone_idx
  ON public.waitlist_entries (customer_phone, requested_date DESC);

CREATE TRIGGER waitlist_entries_set_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
-- No policies: deny-all to anon/authenticated; all access via the service-role client.