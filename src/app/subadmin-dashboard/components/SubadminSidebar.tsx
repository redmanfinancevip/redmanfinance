'use client';

import React from 'react';
import {
  Users, Vault, ArrowLeftRight, FileCheck, ShieldAlert,
  ChevronLeft, ChevronRight, LogOut, UserCog,
} from 'lucide-react';
import { SubadminNavSection } from './SubadminDashboardLayout';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SubadminSidebarProps {
  activeSection: SubadminNavSection;
  onSectionChange: (s: SubadminNavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
}

const navItems: {
  id: SubadminNavSection;
  label: string;
  icon: React.ElementType;
  badge?: string;
  description: string;
}[] = [
  {
    id: 'users',
    label: 'Assigned Users',
    icon: Users,
    badge: '12',
    description: 'Manage your assigned users',
  },
  {
    id: 'vault',
    label: 'Sub-Vault',
    icon: Vault,
    description: 'Internal vault management',
  },
  {
    id: 'asset-recovery',
    label: 'Asset Recovery',
    icon: ShieldAlert,
    description: 'Manage asset recovery requests',
  },
  {
    id: 'transactions',
    label: 'Tx Approvals',
    icon: ArrowLeftRight,
    badge: '5 pending',
    description: 'Approve transactions under $10k',
  },
  {
    id: 'kyc-messages',
    label: 'KYC & Messages',
    icon: FileCheck,
    badge: '3 new',
    description: 'KYC reviews and user messages',
  },
];

export default function SubadminSidebar({
  activeSection, onSectionChange, collapsed, onToggleCollapse, mobileOpen,
}: SubadminSidebarProps) {
  const router = useRouter();

  return (
    <aside
      className={`
        sidebar-transition fixed lg:relative z-50 lg:z-auto
        flex flex-col bg-card border-r border-border h-full shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-border shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #E8500A 0%, #FF6B35 100%)' }}
        >
          <UserCog size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-foreground whitespace-nowrap">Redman Finance</div>
            <div className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--warning)' }}>
              Subadmin Panel
            </div>
          </div>
        )}
      </div>

      {/* Scope Notice */}
      {!collapsed && (
        <div
          className="mx-3 mt-3 px-3 py-2 rounded-lg text-xs"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--warning)' }}
        >
          <span className="font-semibold">Scoped Access</span>
          <span className="text-muted-foreground block mt-0.5">Assigned users only</span>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">
        {!collapsed && (
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Operations
            </span>
          </div>
        )}
        {navItems.map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={`sub-nav-${item.id}`}
              onClick={() => onSectionChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                ${isActive ? 'nav-item-active' : 'nav-item-inactive'}
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <ItemIcon size={17} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: item.badge.includes('pending') || item.badge.includes('new')
                          ? 'var(--danger-bg)' : isActive ? 'rgba(232,80,10,0.2)' : 'var(--muted)',
                        color: item.badge.includes('pending') || item.badge.includes('new')
                          ? 'var(--danger)' : isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-4 border-t border-border space-y-0.5">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/');
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg nav-item-inactive"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg nav-item-inactive"
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          {!collapsed && <span className="text-sm font-medium">Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
}
