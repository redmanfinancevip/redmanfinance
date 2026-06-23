'use client';

import React, { useState, useEffect } from 'react';
import SubadminSidebar from './SubadminSidebar';
import SubadminTopbar from './SubadminTopbar';
import SubadminUsersView from './SubadminUsersView';
import SubadminVaultView from './SubadminVaultView';
import SubadminTransactionsView from './SubadminTransactionsView';
import SubadminKycMessagesView from './SubadminKycMessagesView';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export type SubadminNavSection = 'users' | 'vault' | 'transactions' | 'kyc-messages' | 'asset-recovery';

export default function SubadminDashboardLayout() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUser();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SubadminNavSection>('users');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/sign-up-login-screen');
      } else if (profile?.role !== 'subadmin' && profile?.role !== 'super_admin') {
        router.push('/user-dashboard');
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user || (profile?.role !== 'subadmin' && profile?.role !== 'super_admin')) {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'users': return <SubadminUsersView />;
      case 'vault': return <SubadminVaultView />;
      case 'transactions': return <SubadminTransactionsView />;
      case 'kyc-messages': return <SubadminKycMessagesView />;
      default: return <SubadminUsersView />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 modal-backdrop z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <SubadminSidebar
        activeSection={activeSection}
        onSectionChange={(s) => { setActiveSection(s); setMobileSidebarOpen(false); }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <SubadminTopbar
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          activeSection={activeSection}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 xl:px-8 2xl:px-10">
          <div className="max-w-screen-2xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
