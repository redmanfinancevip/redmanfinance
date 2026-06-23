'use client';

import React from 'react';
import { 
  FolderMinus, 
  TrendingUp, 
  Wallet, 
  DollarSign, 
  MessageSquare, 
  User, 
  Settings, 
  Bell, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDashboardData } from '@/hooks/useDashboardData';
import { UserNavSection } from './UserDashboardLayout';

interface UserSidebarProps {
  activeSection: UserNavSection;
  onSectionChange: (section: UserNavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userProfile: any;
  mobileOpen: boolean;
}

export default function UserSidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onToggleCollapse,
  userProfile,
  mobileOpen,
}: UserSidebarProps) {
  
  // Live poll sync engine matching topbar properties
  const { profile, loading } = useDashboardData(userProfile?.id);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/sign-up-login-screen';
  };

  const userEmail = userProfile?.email || 'investor@redman.finance';
  const rawName = profile?.full_name || profile?.username || userProfile?.user_metadata?.full_name;
  const displayName = rawName || userEmail.split('@')[0];
  
  const userInitials = displayName
    .trim()
    .split(/\s+/)
    .map((word: string) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const grade = profile?.grade || 'I';
  const gradeMap: Record<string, string> = { 
    'I': 'Bronze', 
    'II': 'Silver', 
    'III': 'Gold', 
    'IV': 'Platinum', 
    'V': 'Diamond' 
  };
  const gradeName = gradeMap[grade] || 'Bronze';

  const navItems = [
    { id: 'home', label: 'Portfolio', icon: FolderMinus },
    { id: 'invest', label: 'Invest', icon: TrendingUp },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: 2 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    // Asset Recovery Hub entry
    { id: 'asset-recovery', label: 'Asset Recovery', icon: ShieldAlert },
  ];

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 select-none
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full'}
        ${collapsed ? 'lg:w-20' : 'lg:w-64'}
      `}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-bold text-white shrink-0">
            R
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-in fade-in duration-200">
              <span className="text-sm font-bold text-foreground tracking-tight">Redman Finance</span>
              <span className="text-[10px] font-medium text-muted-foreground">Investor Portal</span>
            </div>
          )}
        </div>
        <button 
          onClick={onToggleCollapse} 
          type="button"
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors focus:outline-none"
          aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Profile/Identity Widget Area */}
      <div className="p-4 border-b border-border bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 font-mono">
            {loading ? <Loader2 className="animate-spin" size={16} /> : userInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-in fade-in duration-200">
              <h4 className="text-sm font-bold text-foreground truncate">{displayName}</h4>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <Shield size={12} className="text-primary" />
                <span className="truncate font-medium text-[11px]">Grade {grade} — {gradeName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Nav Items Iteration */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id as UserNavSection)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative focus:outline-none
                ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} />
              {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary dashboard-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Elements */}
      <div className="p-3 border-t border-border space-y-1">
        <button 
          type="button"
          onClick={() => onSectionChange('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none ${activeSection === 'settings' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          title={collapsed ? "Notifications" : undefined}
        >
          <Bell size={18} />
          {!collapsed && <span className="text-left flex-1">Notifications</span>}
        </button>
        <button 
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors focus:outline-none"
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-left flex-1">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}