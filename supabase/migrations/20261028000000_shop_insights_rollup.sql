-- Security audit 2026-10-23, finding L8 (docs/security/audit-2026-10-23.md).
--
-- The shop report used to select every booking/expense row in its window and
-- sum them in JS. PostgREST caps a response at 1,000 rows without an error,
-- so a busy shop's 90-day or yearly revenue came out silently low.
--
-- This function does the summing in Postgres and returns ONE jsonb value
-- (not a row set, so the max-rows cap never applies). Bookings are rolled up
-- by every dimension a metric reads — window, staff, service, status, slot
-- hour — and expenses by window + category. The pure aggregate in
-- src/lib/insights/aggregate.ts does the rest (its `groupBookings` mirrors
-- this grouping for tests).
--
-- `cur` is true for the current window, false for the comparison window.
-- A null window bound matches nothing (empty window).

create or replace function public.shop_insights_rollup(
  p_shop_id uuid,
  p_cur_start date,
  p_cur_end date,
  p_cmp_start date,
  p_cmp_end date
) returns jsonb
  language sql
  stable
  set search_path = ''
as $function$
  select jsonb_build_object(
    'bookings', coalesce((
      select jsonb_agg(g)
      from (
        select
          b.booking_date between p_cur_start and p_cur_end as cur,
          b.staff_id,
          b.service_id,
          b.status,
          extract(hour from b.slot_time)::int as hour,
          count(*)::int as n,
          sum(b.service_duration_minutes)::int as minutes,
          coalesce(sum(b.service_price), 0) as revenue
        from public.bookings b
        where b.shop_id = p_shop_id
          and b.status in ('confirmed', 'cancelled', 'completed')
          and (
            b.booking_date between p_cur_start and p_cur_end
            or b.booking_date between p_cmp_start and p_cmp_end
          )
        group by 1, 2, 3, 4, 5
      ) g
    ), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(g)
      from (
        select
          e.expense_date between p_cur_start and p_cur_end as cur,
          e.category,
          sum(e.amount) as amount,
          count(*)::int as n
        from public.shop_expenses e
        where e.shop_id = p_shop_id
          and (
            e.expense_date between p_cur_start and p_cur_end
            or e.expense_date between p_cmp_start and p_cmp_end
          )
        group by 1, 2
      ) g
    ), '[]'::jsonb)
  );
$function$;

-- Only the service-role server code calls this.
revoke execute on function public.shop_insights_rollup(uuid, date, date, date, date)
  from public, anon, authenticated;
grant execute on function public.shop_insights_rollup(uuid, date, date, date, date)
  to service_role;
