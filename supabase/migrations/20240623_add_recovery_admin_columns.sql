-- 20240623_add_recovery_admin_columns.sql
-- Add admin approval fields to asset_recoveries for recovered amount and review notes

alter table public.asset_recoveries
  add column if not exists recovered_amount numeric,
  add column if not exists admin_note text;
