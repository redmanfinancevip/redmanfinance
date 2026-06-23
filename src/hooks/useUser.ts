// useUser Hook - User profile management
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
  address: string | null
  role: 'user' | 'subadmin' | 'super_admin'
  tier: string
  grade: number
  investment_balance: number
  earnings_balance: number
  bonus_balance: number
  kyc_status: 'pending' | 'approved' | 'rejected'
  account_status: 'active' | 'locked' | 'flagged' | 'deleted'
  created_at: string
}

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let channel: any = null;

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setProfile(null)
          return
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(data)

        // Subscribe to profile changes for this specific user
        channel = supabase
          .channel(`user-profile-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              setProfile(payload.new as UserProfile)
            }
          )
          .subscribe();
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { profile, loading, error, updateProfile }
}
