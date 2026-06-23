-- 20240622_create_recovery_audit_logs.sql
-- Creates recovery_audit_logs table and attaches trigger for logging status changes

create extension if not exists "pgcrypto";

create table if not exists public.recovery_audit_logs (
  id uuid primary key default gen_random_uuid(),
  recovery_id uuid not null references public.asset_recoveries(id) on delete cascade,
  admin_id uuid,
  previous_status text,
  new_status text,
  change_reason text,
  changed_at timestamptz not null default now()
);

-- Function that will be used by trigger to insert audit rows (also provided as a standalone SQL function under /supabase/functions)
create or replace function public.log_recovery_status_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE') then
    if (OLD.status is distinct from NEW.status) then
      insert into public.recovery_audit_logs(recovery_id, admin_id, previous_status, new_status, changed_at)
      values (NEW.id, current_setting('app.current_admin_id', true)::uuid, OLD.status, NEW.status, now());
    end if;
  end if;
  return NEW;
end;
$$;

-- Attach the trigger to asset_recoveries if not already present
drop trigger if exists recovery_status_change on public.asset_recoveries;
create trigger recovery_status_change
after update on public.asset_recoveries
for each row
execute function public.log_recovery_status_change();
