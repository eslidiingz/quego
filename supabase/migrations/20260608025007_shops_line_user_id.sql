alter table public.shops
  add column if not exists line_user_id text;

create unique index if not exists shops_line_user_id_unique
  on public.shops (line_user_id)
  where line_user_id is not null;

comment on column public.shops.line_user_id is
  'LINE Messaging API userId bound via the shop LINE Login (OAuth) connect flow. Nullable; partial-unique on non-null values. Used to push booking notifications to the shop owner.';