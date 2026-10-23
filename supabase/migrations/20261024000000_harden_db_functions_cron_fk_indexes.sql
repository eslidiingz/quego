-- Security audit 2026-10-23, findings M2 / L5 / L9 (docs/security/audit-2026-10-23.md).
--
-- 1. SECURITY DEFINER functions were executable by `anon` / `authenticated`
--    through PostgREST (/rest/v1/rpc/...). The app only ever calls them with
--    the service-role key, so revoke everyone else.
--    Trigger functions need no EXECUTE grant to fire: Postgres checks EXECUTE
--    only at CREATE TRIGGER time.
-- 2. rate_limit_hit: pin search_path to '' (fully-qualified refs) and reject
--    absurd bucket keys so a caller can't bloat the table with huge keys.
-- 3. pg_cron retention for rate_limits and line_message_log, which nothing
--    ever purged.
-- 4. Covering indexes for the 9 foreign keys the Supabase advisor flagged.

-- 1. Lock down function execution ----------------------------------------
revoke execute on function public.rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.tg_bookings_set_updated_at()
  from public, anon, authenticated;
revoke execute on function public.tg_customers_set_updated_at()
  from public, anon, authenticated;

grant execute on function public.rate_limit_hit(text, integer, integer)
  to service_role;

-- 2. Harden rate_limit_hit (CREATE OR REPLACE keeps the ACL set above) ----
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
  language plpgsql
  security definer
  set search_path = ''
as $function$
declare
  v_count int;
begin
  -- App bucket keys are short (prefix + phone / uuid / ip). Anything longer
  -- is not ours: deny instead of storing it.
  if p_bucket is null or length(p_bucket) > 200 then
    return false;
  end if;

  insert into public.rate_limits as r (bucket, count, reset_at)
  values (p_bucket, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set count = case when r.reset_at < now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at < now()
                        then now() + make_interval(secs => p_window_seconds)
                        else r.reset_at end
  returning count into v_count;

  return v_count <= p_limit;
end;
$function$;

-- 3. Retention jobs (cron.schedule upserts by job name, so this is re-runnable)
create extension if not exists pg_cron;

select cron.schedule(
  'purge-expired-rate-limits',
  '17 3 * * *', -- daily 03:17 UTC
  $$delete from public.rate_limits where reset_at < now() - interval '1 day'$$
);

select cron.schedule(
  'purge-old-line-message-log',
  '27 3 * * *', -- daily 03:27 UTC
  $$delete from public.line_message_log where created_at < now() - interval '90 days'$$
);

-- 4. Covering indexes for foreign keys -----------------------------------
create index if not exists bookings_staff_id_idx
  on public.bookings (staff_id);
create index if not exists category_service_presets_created_by_idx
  on public.category_service_presets (created_by);
create index if not exists category_service_presets_updated_by_idx
  on public.category_service_presets (updated_by);
create index if not exists shop_categories_created_by_idx
  on public.shop_categories (created_by);
create index if not exists shop_categories_updated_by_idx
  on public.shop_categories (updated_by);
create index if not exists shops_reviewed_by_idx
  on public.shops (reviewed_by);
create index if not exists waitlist_entries_fulfilled_booking_id_idx
  on public.waitlist_entries (fulfilled_booking_id);
create index if not exists waitlist_entries_preferred_staff_id_idx
  on public.waitlist_entries (preferred_staff_id);
create index if not exists waitlist_entries_service_id_idx
  on public.waitlist_entries (service_id);
