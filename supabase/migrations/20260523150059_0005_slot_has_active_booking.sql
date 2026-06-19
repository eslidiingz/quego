-- =========================================================================
-- Denormalized flag on slots so the public slot picker can answer
-- "is this slot taken?" without reading the bookings table at all.
--
-- Why: bookings RLS only lets a customer see their own bookings, so a
-- naive LEFT JOIN from the picker would falsely show other people's
-- taken slots as available. Maintaining slot.has_active_booking via a
-- trigger keeps the picker query a single public SELECT on slots.
-- =========================================================================

ALTER TABLE public.slots
  ADD COLUMN has_active_booking boolean NOT NULL DEFAULT false;

-- Backfill any existing data
UPDATE public.slots s
SET has_active_booking = EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.slot_id = s.id
    AND b.status IN ('confirmed', 'completed', 'no_show')
);

CREATE OR REPLACE FUNCTION public.recompute_slot_active_booking(p_slot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.slots
  SET has_active_booking = EXISTS (
    SELECT 1 FROM public.bookings
    WHERE slot_id = p_slot_id
      AND status IN ('confirmed', 'completed', 'no_show')
  )
  WHERE id = p_slot_id;
END;
$$;

-- Locked down: only the trigger needs to run this
REVOKE EXECUTE ON FUNCTION public.recompute_slot_active_booking(uuid)
  FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bookings_sync_slot_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE') THEN
    PERFORM public.recompute_slot_active_booking(NEW.slot_id);
  END IF;
  IF (TG_OP = 'UPDATE') AND (NEW.slot_id IS DISTINCT FROM OLD.slot_id) THEN
    PERFORM public.recompute_slot_active_booking(OLD.slot_id);
  END IF;
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_slot_active_booking(OLD.slot_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER bookings_sync_slot_flag_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_sync_slot_flag();
