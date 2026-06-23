'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData'; // 1. Swapped hook import
import UserDashboardLayout from './components/UserDashboardLayout';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UserDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  
  // 2. Swapped useRealtime with useDashboardData hook
  const { 
    profile, 
    activeInvestments: investments, 
    recentTransactions: transactions, 
    loading: dataLoading 
  } = useDashboardData(user?.id);

  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-up-login-screen');
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const resolvedProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || '',
    username: user.user_metadata?.username || '',
    balance: 0,
    main_balance: 0,
    bonus_balance: 0,
    earnings_balance: 0,
    kyc_status: 'not_submitted',
    status: 'active',
    crypto_deposit_address: null,
    grade: null,
    created_at: user.created_at || null
  };

  return (
    <UserDashboardLayout
      profile={resolvedProfile}
      investments={investments}
      transactions={transactions}
      userProfile={user}
    />
  );
}