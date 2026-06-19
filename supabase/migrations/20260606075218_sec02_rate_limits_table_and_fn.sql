-- SEC-02 (MEDIUM): fixed-window rate limiter for public writes. Authorized by user.
create table if not exists public.rate_limits (
  bucket text primary key,
  count int not null default 0,
  reset_at timestamptz not null default now()
);
alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_hit(
  p_bucket text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as r (bucket, count, reset_at)
  values (p_bucket, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set count = case when r.reset_at < now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at < now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;