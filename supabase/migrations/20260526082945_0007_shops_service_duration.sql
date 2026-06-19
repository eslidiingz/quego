-- How long a single service appointment takes at this shop. Drives queue
-- ETA calculations once booking is wired up. 5–480 minute range covers
-- quick services (e.g. nail polish change) through long spa packages.
alter table public.shops
  add column service_duration_minutes integer not null default 30
    check (service_duration_minutes between 5 and 480);

comment on column public.shops.service_duration_minutes is
  'Typical duration of a single service appointment, in minutes.';
