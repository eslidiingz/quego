-- Trigger functions should never be reachable via PostgREST RPC. Revoke
-- EXECUTE from anon + authenticated; PostgreSQL still calls it implicitly
-- as the table owner because the trigger holds the binding.
revoke all on function public.tg_bookings_set_updated_at() from anon;
revoke all on function public.tg_bookings_set_updated_at() from authenticated;