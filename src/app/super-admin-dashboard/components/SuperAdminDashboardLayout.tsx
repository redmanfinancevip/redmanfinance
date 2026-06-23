'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import AdminDashboardView from './AdminDashboardView';
import AdminUsersView from './AdminUsersView';
import AdminTransactionsView from './AdminTransactionsView';
import AdminTransactionHistoryView from './AdminTransactionHistoryView';
import AdminWalletsView from './AdminWalletsView';
import AdminAuditView from './AdminAuditView';
import AdminNotificationsView from './AdminNotificationsView';
import AdminRecoveryView from './AdminRecoveryView';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export type AdminNavSection =
  | 'notifications' | 'dashboard' | 'users' | 'plans'
  | 'wallets'| 'transactions' | 'tx-history' | 'reports' | 'features' | 'settings' | 'audit' | 'asset-recovery-master';

export default function SuperAdminDashboardLayout() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUser();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<AdminNavSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Real-time synchronization token passed down to sub-components
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/sign-up-login-screen');
      } else if (profile?.role !== 'super_admin') {
        if (profile?.role === 'subadmin') {
          router.push('/subadmin-dashboard');
        } else {
          router.push('/user-dashboard');
        }
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  // Hook into cross-component updates (Wallet adjustments, new routes, refilled sub-vaults)
  useEffect(() => {
    const handleLedgerSyncEvent = () => {
      // Incrementing this value triggers an immediate, unified data reload down the DOM tree
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener('wallet-update', handleLedgerSyncEvent);
    return () => window.removeEventListener('wallet-update', handleLedgerSyncEvent);
  }, []);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user || profile?.role !== 'super_admin') {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'notifications': 
        return <AdminNotificationsView key={`notifications-${refreshTrigger}`} />;
      case 'dashboard': 
        return <AdminDashboardView key={`dashboard-${refreshTrigger}`} />;
      case 'users': 
        return <AdminUsersView key={`users-${refreshTrigger}`} />;
      case 'transactions': 
        return <AdminTransactionsView key={`transactions-${refreshTrigger}`} />;
      case 'tx-history': 
        return <AdminTransactionHistoryView key={`tx-history-${refreshTrigger}`} />;
      case 'wallets': 
        return <AdminWalletsView key={`wallets-${refreshTrigger}`} />;
      case 'audit': 
        return <AdminAuditView key={`audit-${refreshTrigger}`} />;
      case 'asset-recovery-master':
        return <AdminRecoveryView key={`recovery-${refreshTrigger}`} />;
      default: 
        return <AdminDashboardView key={`default-dash-${refreshTrigger}`} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/10">
      {/* Mobile Sidebar Overlay Mask */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 modal-backdrop z-40 lg:hidden bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Left Side Drawer Panel navigation */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={(s) => { setActiveSection(s); setMobileSidebarOpen(false); }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
      />

      {/* Core Dynamic Content Window Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AdminTopbar
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          activeSection={activeSection}
        />
        
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 xl:px-8 2xl:px-10 scroll-smooth">
          <div className="max-w-screen-2xl mx-auto animate-in fade-in-50 duration-200">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}