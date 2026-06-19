-- OPP-14 CRM-lite: per-shop internal note about a customer (keyed by phone).
-- One editable note row per (shop, customer_phone). RLS deny-all; service-role only.
create table if not exists public.shop_customer_notes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_phone text not null check (customer_phone ~ '^[0-9]{9,10}$'),
  note text not null check (length(btrim(note)) >= 1 and char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, customer_phone)
);

comment on table public.shop_customer_notes is
  'OPP-14 CRM-lite: a shop''s private internal note about a customer, keyed by (shop_id, customer_phone). One editable row per pair. Phone is the cross-booking identity key (mirrors bookings/reviews). RLS deny-all; service-role access only. Notes are private to the owning shop.';
comment on column public.shop_customer_notes.note is 'Free-text internal note (1..2000 chars), e.g. allergy / "ลูกค้าประจำ ชอบฟอง". Never shown to the customer.';

create index if not exists shop_customer_notes_shop_idx
  on public.shop_customer_notes (shop_id, customer_phone);

alter table public.shop_customer_notes enable row level security;