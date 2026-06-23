'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Bell, Search, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { AdminNavSection } from './SuperAdminDashboardLayout';
import { supabase } from '@/lib/supabase';

const sectionTitles: Record<AdminNavSection, string> = {
  notifications: 'Notifications',
  dashboard: 'Platform Dashboard',
  users: 'User Management',
  plans: 'Plans & Earnings',
  wallets: 'Wallets & Crypto',
  transactions: 'Transactions & Approvals',
  reports: 'Reports & Analytics',
  features: 'Features & Stunts',
  settings: 'Settings',
  audit: 'Audit Log',
  'tx-history': 'Transaction History',
  'asset-recovery-master': 'Asset Recovery (Global)',
};

interface AdminTopbarProps {
  onMobileMenuToggle: () => void;
  activeSection: AdminNavSection;
  onRefreshData?: () => Promise<void> | void;
}

export default function AdminTopbar({ onMobileMenuToggle, activeSection, onRefreshData }: AdminTopbarProps) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [adminInitials, setAdminInitials] = useState<string>('AD');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('just now');
  
  // Quick Search Layout State
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const syncUnreadBadge = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

      setUnreadCount(count || 0);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error syncing topbar badges:', err);
    }
  }, []);

  useEffect(() => {
    const fetchProfileMetadata = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || '';
      if (email) {
        setAdminInitials(email.substring(0, 2).toUpperCase());
      }
    };

    fetchProfileMetadata();
    syncUnreadBadge();

    // Hook real-time insertion changes to keep top bar badge accurate
    const topbarChannel = supabase
      .channel('topbar-badge-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => syncUnreadBadge())
      .subscribe();

    return () => {
      supabase.removeChannel(topbarChannel);
    };
  }, [syncUnreadBadge]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      await syncUnreadBadge();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600); // Smooth spin deceleration window
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card shrink-0 relative">
      
      {/* Left side info block */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 lg:hidden text-muted-foreground hover:text-foreground rounded-xl bg-muted/40 transition-all"
          aria-label="Toggle structural menu layout"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-foreground">{sectionTitles[activeSection]}</h1>
          <div className="flex items-center gap-2.5 mt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Live Link</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:block">
              Sync baseline: {lastSyncTime}
            </span>
          </div>
        </div>
      </div>

      {/* Right side operational tool actions */}
      <div className="flex items-center gap-2">
        
        {/* Dynamic Inline Command Search Input */}
        <div className={`flex items-center transition-all duration-200 ${searchOpen ? 'w-48 sm:w-64' : 'w-9'}`}>
          {searchOpen ? (
            <div className="relative w-full flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find hashes, users, clearings..."
                className="w-full bg-muted/60 text-xs text-foreground pl-3 pr-8 py-1.5 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button 
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setSearchOpen(true)} 
              className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-all"
              title="Search operations database"
            >
              <Search size={16} />
            </button>
          )}
        </div>

        {/* Action Trigger Revalidation Button */}
        <button 
          onClick={handleManualRefresh}
          className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-all"
          title="Force pipeline synchronization clear"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-primary' : ''} />
        </button>
        
        {/* Alert Indicator Counter Container */}
        <div className="relative">
          <div className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-all cursor-pointer">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-card shadow-sm animate-scale-up">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Divider Node */}
        <div className="w-px h-5 bg-border/80 mx-1.5 hidden sm:block" />

        {/* Quick Identity Token Avatar Graphic */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-mono font-bold text-white tracking-wider cursor-pointer shadow-sm select-none hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
        >
          {adminInitials}
        </div>
      </div>
    </header>
  );
}