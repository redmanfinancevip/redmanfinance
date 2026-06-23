// useRealtime Hook - Real-time updates for profiles, balances, investments, and transactions
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  username: string | null
  balance: number
  main_balance: number
  bonus_balance: number
  earnings_balance: number
  kyc_status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  status: 'active' | 'flagged' | 'locked'
  crypto_deposit_address: string | null
  grade: string | null
  created_at: string | null
  kyc_progress_percent?: number
  id_verification_state?: 'pending' | 'under_review' | 'completed' | 'failed' | null
  milestone_alpha_state?: 'pending' | 'under_review' | 'completed' | 'failed' | null
  milestone_beta_state?: 'pending' | 'under_review' | 'completed' | 'failed' | null
  milestone_gamma_state?: 'pending' | 'under_review' | 'completed' | 'failed' | null
  timeline_anchor_date?: string | null
  selected_grace_days?: number | null
  grace_index_rate?: number
  upgrade_required?: boolean
  required_volume?: number | null
  velocity_threshold?: number | null
}

export interface Investment {
  id: string
  user_id: string
  plan_id: string
  amount: number
  principal: number
  earnings_accrued: number
  status: 'active' | 'matured' | 'withdrawn'
  start_date: string
  maturity_date: string
  last_accrual_date: string
  auto_reinvest: boolean
  created_at?: string // Kept optional for interface safety
  updated_at?: string
  plan_name?: string
  asset_class?: string
  duration_days?: number
  daily_yield_rate?: number
  total_earned?: number
}

export interface Transaction {
  id: string
  user_id: string
  type: 'deposit' | 'withdrawal' | 'earnings' | 'investment' | 'bonus' | 'vault_disbursement' | 'vault_refill' | 'yield'
  amount: number
  asset: string | null
  status: 'pending' | 'completed' | 'rejected' | 'flagged'
  tx_hash: string | null
  note: string | null
  processed_by: string | null
  created_at: string
  usd_value?: number
  rejection_reason?: string
}

export function useRealtime(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    setLoading(true)

    // 1. Fetch initial profile & balance tracking records
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (err: any) {
        console.error('[useRealtime] Profile Fetch Error:', err.message)
        setError(err.message)
      }
    }

    // 2. Fetch initial investments (UPDATED: Ordered by start_date to prevent Error 42703)
    const fetchInvestments = async () => {
      try {
        const { data, error } = await supabase
          .from('investments')
          .select('*, plans(*)')
          .eq('user_id', userId)
          .order('start_date', { ascending: false }) // Fixed column target

        if (error) throw error
        
        const enriched = (data || []).map((inv: any) => ({
          ...inv,
          plan_name: inv.plans?.name || 'Standard Yield Contract',
          asset_class: inv.plans?.asset_type || 'Digital Assets',
          duration_days: inv.plans?.duration_days || 90,
          daily_yield_rate: inv.daily_yield_rate || (inv.plans?.roi_percent ? (Number(inv.plans.roi_percent) / 100 / (inv.plans.duration_days || 90)) : 0.0038),
          total_earned: Number(inv.earnings_accrued || 0)
        }))

        setInvestments(enriched)
      } catch (err: any) {
        console.error('[useRealtime] Investments Fetch Error:', err.message)
        setError(err.message)
      }
    }

    // 3. Fetch initial transaction history log rows
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setTransactions(data || [])
      } catch (err: any) {
        console.error('[useRealtime] Transactions Fetch Error:', err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    // Execute baseline data gathering
    fetchProfile()
    fetchInvestments()
    fetchTransactions()

    // 4. Construct unified modern Real-Time Listener Channel
    const realtimeChannel = supabase
      .channel(`db_sync_user_${userId}`)
      // Stream Profile Update Modifications (Live Balances Changing)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setProfile(payload.new as Profile)
        }
      )
      // Stream Investment Accumulations & Influxes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchInvestments()
          }
        }
      )
      // Stream Transaction History Mutations
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransactions((prev) => [payload.new as Transaction, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTransactions((prev) =>
              prev.map((tx) => (tx.id === payload.new.id ? (payload.new as Transaction) : tx))
            )
          }
        }
      )
      .subscribe()

    // Unmount cleanup routine
    return () => {
      supabase.removeChannel(realtimeChannel)
    }
  }, [userId])

  const createInvestment = async (data: Omit<Investment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true)
      const { data: result, error } = await supabase
        .from('investments')
        .insert([data])
        .select()
        .single()

      if (error) throw error
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      setLoading(true)
      const { data: result, error } = await supabase
        .from('transactions')
        .insert([data])
        .select()
        .single()

      if (error) throw error
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    investments,
    transactions,
    loading,
    error,
    createInvestment,
    createTransaction,
  }
}