-- OPP-18 admin audit log: who(admin) did what(action) to which entity, when.
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id),
  action text not null,            -- e.g. 'shop.approve','shop.reject','shop.update','shop.impersonate','category.create','category.update','category.delete','preset.create','preset.update','preset.toggle_active','preset.delete'
  entity_type text not null,       -- 'shop' | 'category' | 'preset'
  entity_id uuid,                  -- nullable; the affected row id when known
  summary text,                    -- short human-readable snapshot (e.g. shop/category name)
  meta jsonb,                      -- action-specific extras: {reason}, {isActive}, {shopName}, {slug}, ...
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security; -- deny-all (no policies) = service-role only

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_admin_id_idx   on public.admin_audit_logs (admin_id);
create index if not exists admin_audit_logs_entity_idx     on public.admin_audit_logs (entity_type, entity_id);

comment on table public.admin_audit_logs is
  'Admin action audit trail (OPP-18): who(admin_id) did what(action) to which entity(entity_type/entity_id) when(created_at); meta jsonb for extras. RLS deny-all; service-role only. Written fail-silent from admin server actions via writeAuditLog().';