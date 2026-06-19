create table public.category_service_presets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.shop_categories(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null,
  price numeric(10,2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.admins(id),
  updated_by uuid references public.admins(id),
  constraint category_service_presets_name_check
    check (length(btrim(name)) >= 1 and length(btrim(name)) <= 120),
  constraint category_service_presets_description_check
    check (description is null or length(description) <= 500),
  constraint category_service_presets_duration_minutes_check
    check (duration_minutes >= 10 and duration_minutes <= 480 and (duration_minutes % 10) = 0),
  constraint category_service_presets_price_check
    check (price is null or price >= 0)
);

comment on table public.category_service_presets is
  'Admin-curated service presets per shop category (e.g. barber -> ตัดผมชาย 30m). Shops import these into their own shop_services catalogue. Mirrors shop_services field rules; duration is a 10-min multiple in [10,480].';

create index category_service_presets_category_sort_idx
  on public.category_service_presets (category_id, sort_order, name);

create unique index category_service_presets_unique_name_per_category
  on public.category_service_presets (category_id, lower(btrim(name)));

alter table public.category_service_presets enable row level security;