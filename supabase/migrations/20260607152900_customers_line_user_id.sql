begin;

alter table public.customers
  add column if not exists line_user_id text;

create unique index if not exists customers_line_user_id_unique
  on public.customers (line_user_id)
  where line_user_id is not null;

comment on column public.customers.line_user_id is
  'LINE Messaging API userId bound via the in-app deep-link flow. Nullable; partial-unique on non-null values. Phone remains the identity key; this is an optional notification channel handle.';

commit;