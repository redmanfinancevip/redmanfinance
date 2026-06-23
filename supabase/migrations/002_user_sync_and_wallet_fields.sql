-- SQL Migration: User Sync Trigger and Wallet Balance Tracking
-- 1. Create a function to handle sync from auth.users to public.users & public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_bonus_amount DECIMAL(20,2);
  v_role TEXT;
BEGIN
  -- Resolve role from metadata, default to 'user'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  -- Resolve referral code from metadata
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- Resolve referrer_id if referral_code is a valid user id or username/email
  IF v_referral_code IS NOT NULL AND v_referral_code <> '' THEN
    SELECT id INTO v_referrer_id FROM public.users 
    WHERE id::text = v_referral_code 
       OR email = v_referral_code 
       OR name = v_referral_code 
       OR id IN (SELECT id FROM public.profiles WHERE referral_code = v_referral_code OR username = v_referral_code)
    LIMIT 1;
  END IF;

  -- 500 bonus by default, 600 if referred
  v_bonus_amount := CASE WHEN v_referrer_id IS NOT NULL THEN 600.00 ELSE 500.00 END;

  -- 1. Insert into public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    bonus_balance,
    investment_balance,
    earnings_balance,
    total_invested_lifetime,
    total_earned_lifetime,
    kyc_status,
    account_status,
    referrer_id,
    signup_date,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Investor'),
    v_role,
    v_bonus_amount,
    0.00,
    0.00,
    0.00,
    0.00,
    'pending',
    'active',
    v_referrer_id,
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = COALESCE(EXCLUDED.role, public.users.role);

  -- 2. Insert into public.profiles
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    kyc_status,
    grade,
    balance,
    main_balance,
    earnings_balance,
    bonus_balance,
    total_volume,
    referred_by,
    referral_code,
    username,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Investor'),
    v_role,
    'active',
    'not_submitted',
    'tier_1',
    v_bonus_amount, -- balance = main + earnings + bonus
    0.00,
    0.00,
    v_bonus_amount,
    0.00,
    v_referrer_id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on auth user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add balance/usd_value to crypto_wallets
ALTER TABLE public.crypto_wallets ADD COLUMN IF NOT EXISTS balance DECIMAL(20,6) DEFAULT 0;
ALTER TABLE public.crypto_wallets ADD COLUMN IF NOT EXISTS usd_value DECIMAL(20,2) DEFAULT 0;
