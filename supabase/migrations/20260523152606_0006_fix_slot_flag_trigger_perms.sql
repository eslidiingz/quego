-- Bug: bookings_sync_slot_flag() ran as the calling user, but
-- recompute_slot_active_booking() had EXECUTE revoked from anon/auth/public
-- → INSERT INTO bookings failed with "permission denied for function".
--
-- Fix: make the trigger function SECURITY DEFINER so it runs as the
-- owner (postgres) and can call the privileged helper. Helper stays locked
-- down so end-users still can't call it via REST RPC.

CREATE OR REPLACE FUNCTION public.bookings_sync_slot_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
