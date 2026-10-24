-- Audit L6: admin_audit_logs is append-only. RLS is deny-all, but the app
-- talks to the DB through the service role, which bypasses RLS — triggers
-- still fire for it, so this is the layer that actually holds.

create or replace function public.admin_audit_logs_block_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_logs is append-only (% blocked)', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

revoke execute on function public.admin_audit_logs_block_change() from public, anon, authenticated;

drop trigger if exists admin_audit_logs_no_update_delete on public.admin_audit_logs;
create trigger admin_audit_logs_no_update_delete
  before update or delete on public.admin_audit_logs
  for each row execute function public.admin_audit_logs_block_change();

drop trigger if exists admin_audit_logs_no_truncate on public.admin_audit_logs;
create trigger admin_audit_logs_no_truncate
  before truncate on public.admin_audit_logs
  for each statement execute function public.admin_audit_logs_block_change();
