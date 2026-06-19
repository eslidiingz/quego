-- bookings_sync_slot_flag is only ever called by its trigger, never via
-- REST RPC. Revoke EXECUTE from end-user roles — the trigger fires as
-- the table owner regardless, so this doesn't break anything.
REVOKE EXECUTE ON FUNCTION public.bookings_sync_slot_flag()
  FROM public, anon, authenticated;