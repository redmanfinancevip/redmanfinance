-- Redman Finance Complete Database Schema
-- This migration creates all necessary tables, functions, and RLS policies

-- ============================================================================
-- 1. USERS TABLE (Core user data with role tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT,
  address TEXT,
  tier TEXT DEFAULT 'tier_1', -- tier_1, tier_2, tier_3, tier_4
  grade INT DEFAULT 1, -- 1-4: grade limit $500k, $1.5M, $3M, 3M+
  role TEXT DEFAULT 'user', -- user, subadmin, super_admin
  investment_balance DECIMAL(20,2) DEFAULT 0,
  earnings_balance DECIMAL(20,2) DEFAULT 0,
  bonus_balance DECIMAL(20,2) DEFAULT 0,
  total_invested_lifetime DECIMAL(20,2) DEFAULT 0,
  total_earned_lifetime DECIMAL(20,2) DEFAULT 0,
  kyc_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  kyc_documents JSONB,
  email_verified BOOLEAN DEFAULT FALSE,
  account_status TEXT DEFAULT 'active', -- active, locked, flagged, deleted
  flag_reason TEXT,
  upline_subadmin_id UUID REFERENCES users(id),
  referrer_id UUID REFERENCES users(id),
  signup_date TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  device_info JSONB,
  risk_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. PLANS TABLE (Investment plans created by Super Admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_type TEXT, -- crypto, stocks, forex, oil, realestate, mixed
  business_story TEXT,
  duration TEXT, -- daily, weekly, monthly, yearly
  duration_days INT,
  roi_percent DECIMAL(5,2) NOT NULL,
  min_deposit DECIMAL(20,2) NOT NULL,
  max_deposit DECIMAL(20,2) NOT NULL,
  per_user_cap DECIMAL(20,2),
  global_cap DECIMAL(20,2),
  payout_frequency TEXT, -- daily, weekly, monthly, on_maturity
  calculation_method TEXT, -- simple, compounding
  accrual_type TEXT, -- realtime, batch_hourly
  early_withdrawal_penalty DECIMAL(5,2) DEFAULT 0,
  visibility TEXT DEFAULT 'active', -- active, draft, archived, paused
  grade_restriction INT DEFAULT 1,
  risk_level TEXT DEFAULT 'medium', -- low, medium, high
  earnings_paused BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  total_invested DECIMAL(20,2) DEFAULT 0,
  active_investors INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. INVESTMENTS TABLE (User investments in plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  amount DECIMAL(20,2) NOT NULL,
  principal DECIMAL(20,2) NOT NULL,
  earnings_accrued DECIMAL(20,2) DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, matured, withdrawn
  start_date TIMESTAMP DEFAULT NOW(),
  maturity_date TIMESTAMP NOT NULL,
  last_accrual_date TIMESTAMP DEFAULT NOW(),
  auto_reinvest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. TRANSACTIONS TABLE (All money movements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- deposit, withdrawal, payout, migration, fee, credit
  amount DECIMAL(20,2) NOT NULL,
  fee DECIMAL(20,2) DEFAULT 0,
  asset TEXT, -- BTC, ETH, USDT, USD
  method TEXT, -- crypto, card, bank
  wallet_address TEXT,
  tx_hash TEXT,
  confirmations INT DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, processing, completed, failed
  grade_upgrade_triggered BOOLEAN DEFAULT FALSE,
  payout_timing TEXT DEFAULT 'instant', -- instant, delay_1h, delay_6h, delay_12h
  payout_scheduled_at TIMESTAMP,
  related_id UUID,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. VAULT_ACCOUNTS TABLE (Super Admin + Subadmin vaults)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vault_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  vault_type TEXT, -- main_vault, subadmin_vault
  balance DECIMAL(20,2) DEFAULT 0,
  asset TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. VAULT_HISTORY TABLE (Track all vault movements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vault_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES vault_accounts(id),
  type TEXT, -- debit, credit
  amount DECIMAL(20,2) NOT NULL,
  reason TEXT, -- fee, payout, refill, manual_send
  related_tx_id UUID,
  related_user_id UUID,
  admin_id UUID REFERENCES users(id),
  note TEXT,
  event_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. GRADE_UPGRADES TABLE (Track grade volume requirements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS grade_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  from_grade INT,
  to_grade INT,
  excess_amount DECIMAL(20,2),
  required_volume DECIMAL(20,2),
  completed_volume DECIMAL(20,2) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, completed
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. BONUSES TABLE (Signup + referral bonuses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_type TEXT, -- signup, referral
  amount DECIMAL(20,2) NOT NULL,
  referrer_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- pending, withdrawable, withdrawn
  withdrawable_after TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT, -- signup, deposit_request, withdrawal_request, kyc_submitted, system_alert
  target TEXT, -- general, personal
  assigned_to UUID REFERENCES users(id),
  title TEXT,
  message TEXT,
  related_id UUID,
  related_type TEXT, -- user_id, transaction_id, kyc_id
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 10. KYC_SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id_document_url TEXT,
  selfie_url TEXT,
  proof_of_address_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 11. AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action TEXT,
  resource_type TEXT, -- user, transaction, plan, wallet, settings
  resource_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 12. CRYPTO_WALLETS TABLE (Super Admin wallet management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_name TEXT,
  coin_symbol TEXT,
  network TEXT,
  wallet_address TEXT,
  qr_code_url TEXT,
  status TEXT DEFAULT 'active',
  min_deposit DECIMAL(20,2),
  min_withdrawal DECIMAL(20,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 13. FEES_CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS fees_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT, -- deposit, withdrawal, migration, early_withdrawal_penalty
  coin TEXT,
  plan_id UUID REFERENCES plans(id),
  tier_min INT,
  tier_max INT,
  fee_amount DECIMAL(20,2),
  fee_percent DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 14. ADMIN_PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT, -- users, transactions, plans, vault, settings, kyc, messaging
  granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (Performance optimization)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_upline_subadmin ON users(upline_subadmin_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_plan_id ON investments(plan_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_notifications_assigned_to ON notifications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_plans_visibility ON plans(visibility);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_grade_upgrades_user_id ON grade_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_grade_upgrades_status ON grade_upgrades(status);
CREATE INDEX IF NOT EXISTS idx_bonuses_user_id ON bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_submissions(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Users RLS
CREATE POLICY users_select_self ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY users_select_super_admin ON users FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY users_select_subadmin ON users FOR SELECT
  USING (upline_subadmin_id = auth.uid() OR auth.uid() = id);

CREATE POLICY users_update_super_admin ON users FOR UPDATE
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY users_update_self ON users FOR UPDATE
  USING (auth.uid() = id);

-- Investments RLS
CREATE POLICY investments_select_self ON investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY investments_select_super_admin ON investments FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY investments_select_subadmin ON investments FOR SELECT
  USING ((SELECT upline_subadmin_id FROM users WHERE id = investments.user_id) = auth.uid());

CREATE POLICY investments_insert_user ON investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Transactions RLS
CREATE POLICY transactions_select_self ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY transactions_select_super_admin ON transactions FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY transactions_select_subadmin ON transactions FOR SELECT
  USING ((SELECT upline_subadmin_id FROM users WHERE id = transactions.user_id) = auth.uid());

CREATE POLICY transactions_insert_user ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Plans RLS
CREATE POLICY plans_select_all ON plans FOR SELECT
  USING (visibility = 'active');

CREATE POLICY plans_select_super_admin ON plans FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- Vault RLS
CREATE POLICY vault_accounts_select_super_admin ON vault_accounts FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY vault_accounts_select_subadmin ON vault_accounts FOR SELECT
  USING (owner_id = auth.uid());

-- Grade Upgrades RLS
CREATE POLICY grade_upgrades_select_self ON grade_upgrades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY grade_upgrades_select_super_admin ON grade_upgrades FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- Audit Logs RLS
CREATE POLICY audit_logs_select_super_admin ON audit_logs FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_grade(balance DECIMAL)
RETURNS INT AS $$
BEGIN
  IF balance <= 500000 THEN RETURN 1;
  ELSIF balance <= 1500000 THEN RETURN 2;
  ELSIF balance <= 3000000 THEN RETURN 3;
  ELSE RETURN 4;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION check_grade_upgrade()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance DECIMAL;
  v_grade_limit DECIMAL;
  v_excess DECIMAL;
  v_required_volume DECIMAL;
BEGIN
  v_current_balance := NEW.investment_balance + NEW.earnings_balance;
  
  IF NEW.grade = 1 THEN v_grade_limit := 500000;
  ELSIF NEW.grade = 2 THEN v_grade_limit := 1500000;
  ELSIF NEW.grade = 3 THEN v_grade_limit := 3000000;
  ELSE v_grade_limit := 999999999;
  END IF;
  
  IF v_current_balance > v_grade_limit AND (SELECT status FROM grade_upgrades WHERE user_id = NEW.id) IS NULL THEN
    v_excess := v_current_balance - v_grade_limit;
    v_required_volume := v_excess * 0.12;
    
    INSERT INTO grade_upgrades (user_id, from_grade, to_grade, excess_amount, required_volume)
    VALUES (NEW.id, NEW.grade, NEW.grade + 1, v_excess, v_required_volume)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_grade_upgrade
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION check_grade_upgrade();

CREATE OR REPLACE FUNCTION auto_upgrade_grade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE grade_upgrades
    SET completed_volume = completed_volume + ABS(NEW.amount),
        status = CASE 
          WHEN completed_volume + ABS(NEW.amount) >= required_volume THEN 'completed'
          ELSE 'pending'
        END,
        completed_at = CASE 
          WHEN completed_volume + ABS(NEW.amount) >= required_volume THEN NOW()
          ELSE NULL
        END
    WHERE user_id = NEW.user_id;
    
    UPDATE users
    SET grade = grade + 1, updated_at = NOW()
    WHERE id = NEW.user_id
      AND EXISTS (
        SELECT 1 FROM grade_upgrades 
        WHERE user_id = NEW.user_id 
          AND status = 'completed'
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_upgrade_grade
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_upgrade_grade();

-- ============================================================================
-- 15. PROFILES TABLE & RLS POLICIES (Required for Frontend Dashboard Sync)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user', -- user, subadmin, super_admin
  status TEXT DEFAULT 'active', -- active, locked, flagged
  kyc_status TEXT DEFAULT 'not_submitted', -- not_submitted, pending, approved, rejected
  grade TEXT DEFAULT 'tier_1',
  balance DECIMAL(20,2) DEFAULT 0,
  earnings_balance DECIMAL(20,2) DEFAULT 0,
  bonus_balance DECIMAL(20,2) DEFAULT 0,
  total_volume DECIMAL(20,2) DEFAULT 0,
  assigned_subadmin_id UUID REFERENCES users(id),
  referral_code TEXT,
  referred_by UUID REFERENCES users(id),
  grade_limit DECIMAL(20,2),
  required_volume DECIMAL(20,2),
  upgrade_required BOOLEAN DEFAULT FALSE,
  username TEXT,
  crypto_deposit_address TEXT,
  main_balance DECIMAL(20,2) DEFAULT 0,
  deposit_balance DECIMAL(20,2) DEFAULT 0,
  kyc_progress_percent INT DEFAULT 0,
  verification_tasks_status JSONB,
  timeline_anchor_date TIMESTAMP,
  selected_grace_days INT,
  grace_penalty_rate DECIMAL(10,5) DEFAULT 0.0005,
  id_verification_state TEXT DEFAULT 'pending', -- pending, under_review, completed, failed
  milestone_alpha_state TEXT DEFAULT 'pending',
  milestone_beta_state TEXT DEFAULT 'pending',
  milestone_gamma_state TEXT DEFAULT 'pending',
  grace_index_rate DECIMAL(10,5) DEFAULT 0.0002,
  velocity_threshold DECIMAL(20,2) DEFAULT 500000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles SELECT policies
CREATE POLICY profiles_select_self ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_select_super_admin ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

CREATE POLICY profiles_select_subadmin ON profiles FOR SELECT
  USING (
    assigned_subadmin_id = auth.uid() OR auth.uid() = id
  );

-- Profiles UPDATE policies
CREATE POLICY profiles_update_self ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY profiles_update_super_admin ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

-- ============================================================================
-- 16. ADDITIONAL RLS POLICIES FOR FRONTEND FUNCTIONALITIES
-- ============================================================================

-- Notifications RLS
CREATE POLICY notifications_select_self ON notifications FOR SELECT
  USING (assigned_to = auth.uid() OR target = 'general');

CREATE POLICY notifications_insert_self ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY notifications_update_self ON notifications FOR UPDATE
  USING (assigned_to = auth.uid());

CREATE POLICY notifications_select_super_admin ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

-- KYC Submissions RLS
CREATE POLICY kyc_select_self ON kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY kyc_insert_self ON kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY kyc_select_super_admin ON kyc_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

CREATE POLICY kyc_update_super_admin ON kyc_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

-- Crypto Wallets RLS
CREATE POLICY crypto_wallets_select_all ON crypto_wallets FOR SELECT
  USING (status = 'active' OR auth.uid() IS NOT NULL);

-- Bonuses RLS
CREATE POLICY bonuses_select_self ON bonuses FOR SELECT
  USING (auth.uid() = user_id);

-- Fees Config RLS
CREATE POLICY fees_config_select_all ON fees_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin Permissions RLS
CREATE POLICY admin_permissions_select_self ON admin_permissions FOR SELECT
  USING (admin_id = auth.uid());

