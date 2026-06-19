-- Enable Supabase Realtime postgres_changes broadcasts on the slots table.
-- Required so the customer slot picker receives INSERT/UPDATE/DELETE events.
--
-- RLS on slots is `USING (true)` so all listeners (anon + authenticated)
-- can see slot changes — exactly what the picker needs.
ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;