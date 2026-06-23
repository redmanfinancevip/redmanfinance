'use client';

import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  LogOut, 
  Settings, 
  Info, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useRealtime';
import { UserNavSection } from './UserDashboardLayout';

interface UserTopbarProps {
  onMobileMenuToggle: () => void;
  activeSection: string;
  profile: Profile;
  onSectionChange: (section: UserNavSection) => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'system' | 'account';
  time: string;
  read: boolean;
}

export default function UserTopbar({ onMobileMenuToggle, activeSection, profile, onSectionChange }: UserTopbarProps) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'system' | 'account'>('system');

  // Structured tracking elements matching target rulesets
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n-1',
      title: 'Real-Time Ledger Active',
      description: '✓ Secure real-time session channel synchronized successfully with cluster servers.',
      type: 'system',
      time: 'Just now',
      read: false
    },
    {
      id: 'n-2',
      title: 'Tier Limit Boundary Alert',
      description: 'Please upgrade your trade volume tier to unlock uninhibited high-clearance withdrawals.',
      type: 'account',
      time: '10m ago',
      read: false
    },
    {
      id: 'n-3',
      title: 'KYC Pathway Active',
      description: 'Identity compliance portal verification is open for automated verification parsing.',
      type: 'system',
      time: '1h ago',
      read: true
    }
  ]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/sign-up-login-screen';
  };

  // Mark an individual entry log as read when explicitly clicked
  const toggleSingleNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Mark all visible category notifications as read simultaneously
  const markCategoryAsRead = (category: 'system' | 'account') => {
    setNotifications(prev => 
      prev.map(n => n.type === category ? { ...n, read: true } : n)
    );
  };

  // Unread badge counters evaluated dynamically
  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadSystem = notifications.filter(n => n.type === 'system' && !n.read).length;
  const unreadAccount = notifications.filter(n => n.type === 'account' && !n.read).length;

  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Investor';
  const displayUsername = profile?.username ? `@${profile.username}` : 'Premium Account';
  const firstLetter = displayName.charAt(0).toUpperCase();

  const titleMap: Record<string, string> = {
    home: 'Portfolio Overview',
    invest: 'Investment Ecosystem',
    wallet: 'Central Treasury Ledger',
    earnings: 'Accrued Return Distributions',
    messages: 'Secure Comm Center',
    profile: 'Identity Management Credentials',
    settings: 'System Preferences Configuration',
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMobileMenuToggle} 
          className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="text-sm lg:text-base font-bold text-foreground tracking-tight capitalize">
            {titleMap[activeSection] || 'Investor Portal'}
          </h2>
          <p className="text-[10px] text-success font-medium flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-success inline-block animate-pulse" /> Live data environment
          </p>
        </div>
      </div>

      {/* Action System Trays */}
      <div className="flex items-center gap-2 relative">
        
        {/* DYNAMIC SEARCH COMPONENT INPUT EXPANSION FIELD */}
        <div className="flex items-center relative">
          {searchActive && (
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query ledgers, assets..."
              className="text-xs bg-muted border border-border rounded-lg pl-3 pr-8 py-1.5 w-40 lg:w-48 text-foreground focus:outline-none focus:border-primary transition-all animate-in fade-in slide-in-from-right-2"
              autoFocus
            />
          )}
          <button 
            onClick={() => {
              setSearchActive(!searchActive);
              if (searchActive) setSearchQuery(''); // Clear field on close
            }}
            className={`p-2 rounded-xl transition-all ${searchActive ? 'text-primary absolute right-0' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title="Search Ledger System"
          >
            <Search size={18} />
          </button>
        </div>

        {/* NOTIFICATIONS CONTAINER BUTTON */}
        <div className="relative">
          <button 
            onClick={() => {
              setNotifOpen(!notifOpen);
              if(!notifOpen) {
                markCategoryAsRead(activeTab);
              }
            }}
            className={`p-2 rounded-xl transition-all relative ${notifOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title="View Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary border-2 border-card text-[9px] font-bold text-white flex items-center justify-center dashboard-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* DROP-DOWN NOTIFICATION PANEL SCREEN LAYER */}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Notification Ledger</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markCategoryAsRead(activeTab)}
                      className="text-[10px] text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Clear current tab
                    </button>
                  )}
                </div>

                {/* SEGMENTATION TABS ROUTER */}
                <div className="grid grid-cols-2 border-b border-border text-center text-xs font-semibold bg-muted/10">
                  <button 
                    onClick={() => { setActiveTab('system'); markCategoryAsRead('system'); }}
                    className={`py-2 border-b-2 transition-colors relative ${activeTab === 'system' ? 'border-primary text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    System Core
                    {unreadSystem > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[9px] font-bold">
                        {unreadSystem}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => { setActiveTab('account'); markCategoryAsRead('account'); }}
                    className={`py-2 border-b-2 transition-colors relative ${activeTab === 'account' ? 'border-primary text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    Account Actions
                    {unreadAccount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 text-[9px] font-bold">
                        {unreadAccount}
                      </span>
                    )}
                  </button>
                </div>

                {/* SEGMENT LIST CANVAS ITERATION */}
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {notifications.filter(n => n.type === activeTab).length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground font-medium">
                      No matching log alerts found in this section.
                    </div>
                  ) : (
                    notifications.filter(n => n.type === activeTab).map((notif) => (
                      <button
                        key={notif.id} 
                        onClick={() => toggleSingleNotificationRead(notif.id)}
                        className={`w-full p-3 text-left transition-colors flex gap-2.5 items-start focus:outline-none ${!notif.read ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'system' ? (
                            <Info size={14} className="text-primary" />
                          ) : (
                            <ShieldAlert size={14} className="text-amber-500" />
                          )}
                        </div>
                        <div className="space-y-0.5 w-full">
                          <p className="text-xs font-bold text-foreground leading-tight flex items-center justify-between gap-1.5">
                            <span className="truncate">{notif.title}</span>
                            {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {notif.description}
                          </p>
                          <p className="text-[9px] font-medium text-muted-foreground/60 font-mono pt-0.5">
                            {notif.time}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* USER IDENTITY DROPDOWN */}
        <div className="relative group">
          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-white shadow-sm border border-primary/20 hover:scale-105 transition-transform font-mono focus:outline-none">
            {firstLetter}
          </button>
          
          {/* Action List Container Triggered Seamlessly via CSS Hover State Grid Hooks */}
          <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-xl py-1.5 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
            <div className="px-3 py-2 border-b border-border bg-muted/20 rounded-t-xl">
              <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{displayUsername}</p>
            </div>
            
            <button 
              onClick={() => onSectionChange('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors mt-1 ${activeSection === 'profile' ? 'bg-muted text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <User size={14} /> Profile Credentials
            </button>
            <button 
              onClick={() => onSectionChange('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${activeSection === 'settings' ? 'bg-muted text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Settings size={14} /> Portal Settings
            </button>
            
            <div className="h-px bg-border my-1" />
            
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={14} /> Exit System Session
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}