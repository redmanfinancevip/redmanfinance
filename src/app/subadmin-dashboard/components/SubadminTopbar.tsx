'use client';

import React from 'react';
import { Menu, Bell, RefreshCw, Search } from 'lucide-react';
import { SubadminNavSection } from './SubadminDashboardLayout';

const sectionTitles: Record<SubadminNavSection, string> = {
  users: 'Assigned Users',
  vault: 'Sub-Vault Management',
  transactions: 'Transaction Approvals',
  'kyc-messages': 'KYC & Messages',
  'asset-recovery': 'Asset Recovery',
};

interface SubadminTopbarProps {
  onMobileMenuToggle: () => void;
  activeSection: SubadminNavSection;
}

export default function SubadminTopbar({ onMobileMenuToggle, activeSection }: SubadminTopbarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="btn-ghost p-2 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-foreground">{sectionTitles[activeSection]}</h1>
          <div className="flex items-center gap-3">
            <div className="live-indicator">
              <div className="live-dot" />
              <span className="text-xs text-muted-foreground">Realtime</span>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium hidden sm:block"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}
            >
              Subadmin · Daniel R.
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-ghost p-2 hidden sm:flex" aria-label="Search">
          <Search size={18} />
        </button>
        <button className="btn-ghost p-2" aria-label="Refresh">
          <RefreshCw size={18} />
        </button>
        <div className="relative">
          <button className="btn-ghost p-2" aria-label="Notifications">
            <Bell size={18} />
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
              style={{ background: 'var(--danger)', fontSize: '9px' }}
            >
              3
            </span>
          </button>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer ml-1"
          style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
        >
          DR
        </div>
      </div>
    </header>
  );
}
