'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, LayoutDashboard, Users, TrendingUp, Wallet,
  ArrowLeftRight, BarChart2, Zap, Settings, FileText,
  ChevronLeft, ChevronRight, LogOut, Shield, ShieldAlert, Loader2
} from 'lucide-react';
import { AdminNavSection } from './SuperAdminDashboardLayout';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AdminSidebarProps {
  activeSection: AdminNavSection;
  onSectionChange: (s: AdminNavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
}

interface NavItemConfig {
  id: AdminNavSection;
  label: string;
  icon: React.ElementType;
  badgeKey?: 'notifications' | 'transactions';
}

interface NavGroupConfig {
  id: string;
  label: string;
  items: NavItemConfig[];
}

const navGroups: NavGroupConfig[] = [
  {
    id: 'group-main',
    label: 'Operations',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'User Management', icon: Users },
      { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, badgeKey: 'transactions' },
    ],
  },
  {
    id: 'group-finance',
    label: 'Finance',
    items: [
      { id: 'plans', label: 'Plans & Earnings', icon: TrendingUp },
      { id: 'wallets', label: 'Wallets & Crypto', icon: Wallet },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart2 },
    ],
  },
  {
    id: 'group-system',
    label: 'System',
    items: [
      { id: 'features', label: 'Features & Stunts', icon: Zap },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'audit', label: 'Audit Log', icon: FileText },
      { id: 'asset-recovery-master', label: 'Asset Recovery', icon: ShieldAlert },
    ],
  },
];

export default function AdminSidebar({
  activeSection, onSectionChange, collapsed, onToggleCollapse, mobileOpen,
}: AdminSidebarProps) {
  const router = useRouter();
  const [adminRoleLabel, setAdminRoleLabel] = useState<string>('Sub Admin');
  const [badges, setBadges] = useState({ notifications: 0, transactions: 0 });

  const syncLiveCounters = useCallback(async () => {
    try {
      // 1. Fetch live unread notification counters
      const { count: unreadNotifs } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

      // 2. Fetch active pending transaction queues matching approval workflows
      const { count: pendingTx } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setBadges({
        notifications: unreadNotifs || 0,
        transactions: pendingTx || 0
      });
    } catch (err) {
      console.error('Failed syncing live sidebar badge counters:', err);
    }
  }, []);

  useEffect(() => {
    // Determine authenticated identity context roles dynamically
    const evaluateSessionRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.role === 'super-admin') {
        setAdminRoleLabel('Super Admin');
      } else {
        setAdminRoleLabel('System Admin');
      }
    };

    evaluateSessionRole();
    syncLiveCounters();

    // Attach dynamic table channel hooks to catch insertions/mutations without polling
    const dataChannel = supabase
      .channel('sidebar-badge-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => syncLiveCounters())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => syncLiveCounters())
      .subscribe();

    return () => {
      supabase.removeChannel(dataChannel);
    };
  }, [syncLiveCounters]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside
      className={`
        sidebar-transition fixed lg:relative z-50 lg:z-auto
        flex flex-col bg-card border-r border-border h-full shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Brand & Context Identifier Pane */}
      <div className={`flex items-center h-16 px-4 border-b border-border shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #E8500A 0%, #FF6B35 100%)' }}
        >
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-foreground whitespace-nowrap">Redman Finance</div>
            <div className="text-[11px] text-primary font-semibold tracking-wider uppercase whitespace-nowrap">
              {adminRoleLabel}
            </div>
          </div>
        )}
      </div>

      {/* Structured Reactive Options Listing */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const NavIcon = item.icon;
                const isActive = activeSection === item.id;
                const activeBadgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

                return (
                  <button
                    key={`admin-nav-${item.id}`}
                    onClick={() => onSectionChange(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 relative group
                      ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}
                      ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <NavIcon size={17} className="shrink-0" />
                    
                    {!collapsed ? (
                      <>
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {activeBadgeCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold transition-colors ${
                            item.badgeKey === 'transactions' 
                              ? 'bg-red-500/10 text-red-500' 
                              : 'bg-primary/20 text-primary'
                          }`}>
                            {activeBadgeCount}
                          </span>
                        )}
                      </>
                    ) : (
                      /* Minimalist Dot Badge indicator overlay layout context for collapsed sidebar configurations */
                      activeBadgeCount > 0 && (
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                          item.badgeKey === 'transactions' ? 'bg-red-500' : 'bg-primary'
                        }`} />
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Command Control Utility Footers */}
      <div className="px-2 py-4 border-t border-border space-y-0.5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          {!collapsed && <span className="text-sm font-medium">Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
}