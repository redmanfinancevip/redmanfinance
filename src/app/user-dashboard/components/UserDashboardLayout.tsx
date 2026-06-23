'use client';

import React, { useState } from 'react';
import UserSidebar from './UserSidebar';
import UserTopbar from './UserTopbar';
import { UserHomeView } from './UserHomeView';
import UserInvestView from './UserInvestView';
import UserWalletView from './UserWalletView';
import UserEarningsView from './UserEarningsView';
import UserMessagesView from './UserMessagesView';
import UserProfileView from './UserProfileView';
import UserSettingsView from './UserSettingsView';
import RecoveryWizard from '@/components/RecoveryWizardV2';
import { Profile, Transaction } from '@/hooks/useRealtime';

export type UserNavSection = 'home' | 'invest' | 'wallet' | 'earnings' | 'messages' | 'profile' | 'settings' | 'asset-recovery';

interface DashboardLayoutProps {
  profile: Profile;
  investments: any[];
  transactions: Transaction[];
  userProfile: any;
}

export default function UserDashboardLayout({
  profile,
  investments,
  transactions,
  userProfile
}: DashboardLayoutProps) {
  const [activeSection, setActiveSection] = useState<UserNavSection>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <UserHomeView
            profile={profile}
            investments={investments}
            transactions={transactions}
            setActiveTab={(tab) => setActiveSection(tab as UserNavSection)}
          />
        );
      case 'invest':
        return <UserInvestView profile={profile} investments={investments} />;
      case 'wallet':
        return <UserWalletView profile={profile} transactions={transactions} staffRole="user" />;
      case 'earnings':
        return <UserEarningsView profile={profile} investments={investments} />;
      case 'messages':
        return <UserMessagesView />;
      case 'profile':
        return <UserProfileView userProfile={userProfile} />;
      case 'settings':
        return <UserSettingsView />;
      case 'asset-recovery':
        return <RecoveryWizard />;
      default:
        return (
          <UserHomeView
            profile={profile}
            investments={investments}
            transactions={transactions}
            setActiveTab={(tab) => setActiveSection(tab as UserNavSection)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-slate-100 font-sans">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <UserSidebar
        activeSection={activeSection}
        onSectionChange={(s) => {
          setActiveSection(s);
          setMobileSidebarOpen(false);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userProfile={userProfile}
        mobileOpen={mobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <UserTopbar
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          activeSection={activeSection}
          profile={profile}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-background/50">
          <div className="max-w-screen-2xl mx-auto p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
