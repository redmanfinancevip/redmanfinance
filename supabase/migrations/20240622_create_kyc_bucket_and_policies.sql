-- 20240622_create_kyc_bucket_and_policies.sql
-- Create a storage bucket for KYC uploads and example RLS policies

-- create bucket (note: in supabase you may configure buckets via UI or management API)
-- This SQL is a best-effort reference; actual bucket creation may require Supabase CLI/API.

-- Example table to track uploads metadata
create table if not exists public.kyc_uploads (
  id uuid primary key default gen_random_uuid(),
  recovery_id uuid not null references public.asset_recoveries(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  path text not null,
  uploaded_at timestamptz not null default now()
);

-- RLS: Allow authenticated users to insert records only for their own recovery
alter table public.kyc_uploads enable row level security;

create policy "allow_user_insert_own" on public.kyc_uploads
  for insert using (auth.role() = 'authenticated') with check ( user_id = auth.uid() );

-- Allow admins to select
create policy "allow_admin_select" on public.kyc_uploads
  for select using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.admin_role in ('sub_admin','super_admin')));

-- Note: Storage bucket policies must be configured via Supabase Storage rules; generate signed URLs in server endpoints when admin requests access.
