-- supabase/functions/log_recovery_status_change.sql
-- Function to log status changes (invoked by trigger on asset_recoveries)

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
