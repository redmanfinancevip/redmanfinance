'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULT_PROFILE_SHAPE = {
  full_name: '',
  username: '',
  main_balance: 0.00,
  earnings_balance: 0.00,
  bonus_balance: 0.00,
  kyc_status: 'unverified',
  crypto_deposit_address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  upgrade_required: false,
  required_volume: 0,
  kyc_progress_percent: 0,
  id_verification_state: 'pending',
  milestone_alpha_state: 'pending',
  milestone_beta_state: 'pending',
  milestone_gamma_state: 'pending',
  timeline_anchor_date: null,
  grace_index_rate: 0.0002
};

export function useDashboardData(userId: string | undefined) {
  const [profile, setProfile] = useState<any>(null);
  const [activeInvestments, setActiveInvestments] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isSystemPaused, setIsSystemPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Structural Lock to block overlapping concurrent requests causing AbortErrors
  const isFetchingRef = useRef(false);

  // Core Data Fetcher
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Skip execution cycle silently if a network request is currently active
    if (isFetchingRef.current) {
      return;
    }
    
    if (!isSilent) {
      setError(null);
    }
    
    try {
      // Turn on the request execution lock
      isFetchingRef.current = true;

      // Execute all three database queries concurrently without broken relation syntax
      const [profileRes, investmentsRes, transactionsRes] = await Promise.all([
        supabase
          .from('profiles') 
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('investments')
          .select('*') // Clean, flat data acquisition
          .eq('user_id', userId),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      // Check for errors across responses
      if (profileRes.error) throw profileRes.error;
      if (investmentsRes.error) throw investmentsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      
      // Update states with live database data
      if (profileRes.data) {
        setProfile(profileRes.data);
      } else {
        setProfile(DEFAULT_PROFILE_SHAPE);
      }

      if (investmentsRes.data) {
        // Log out the raw record keys to your browser console so we can audit the live columns instantly!
        if (investmentsRes.data.length > 0) {
          console.log('[Live Database Verification] Investments object keys:', Object.keys(investmentsRes.data[0]));
        }

        const enriched = investmentsRes.data.map((inv: any) => ({
          ...inv,
          plan_name: inv.plan_name || 'Standard Yield Contract',
          asset_class: inv.asset_class || 'Digital Assets',
          duration_days: inv.duration_days || 90,
          daily_yield_rate: inv.daily_yield_rate || 0.0038,
          total_earned: Number(inv.earnings_accrued || 0)
        }));
        setActiveInvestments(enriched);
      }

      if (transactionsRes.data) {
        setRecentTransactions(transactionsRes.data);
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      
      console.error('[DashboardData] Fetch error occurred:', err.message);
      if (!isSilent) {
        setError(err.message);
        setProfile(DEFAULT_PROFILE_SHAPE);
      }
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Initial Load Cycle
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchDashboardData(false);
  }, [userId, fetchDashboardData]);

  // High-Performance Polling Sync Engine
  useEffect(() => {
    if (!userId) return;

    console.log('[Sync Engine] Initializing stable delta polling interval...');
    
    const syncInterval = setInterval(() => {
      fetchDashboardData(true); 
    }, 3500);

    return () => {
      console.log('[Sync Engine] Tearing down delta polling interval.');
      clearInterval(syncInterval);
    };
  }, [userId, fetchDashboardData]);

  const refetch = () => {
    isFetchingRef.current = false;
    fetchDashboardData(false);
  };

  return { 
    profile, 
    activeInvestments, 
    recentTransactions, 
    isSystemPaused, 
    loading, 
    error, 
    refetch 
  };
}