'use client';

import React, { useState, useEffect } from 'react';
import {
  Search, AlertTriangle, CheckCircle2, Lock, Eye,
  ChevronDown, ChevronUp, ChevronsUpDown, MessageSquare, FileCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type SortKey = 'name' | 'totalDeposited' | 'balance' | 'riskScore';
type SortDir = 'asc' | 'desc';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'status-active', flagged: 'status-flagged', locked: 'status-locked',
  };
  const icons: Record<string, React.ElementType> = {
    active: CheckCircle2, flagged: AlertTriangle, locked: Lock,
  };
  const BadgeIcon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${map[status] ?? 'status-locked'}`}>
      {BadgeIcon && <BadgeIcon size={10} />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function KycBadge({ kycStatus }: { kycStatus: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: 'Verified', cls: 'status-active' },
    approved: { label: 'Approved', cls: 'status-active' },
    pending: { label: 'Pending', cls: 'status-pending' },
    not_submitted: { label: 'None', cls: 'status-locked' },
    rejected: { label: 'Rejected', cls: 'status-rejected' },
  };
  const entry = map[kycStatus] ?? { label: kycStatus, cls: 'status-locked' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

export default function SubadminUsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('totalDeposited');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        toast.error(data.error || 'Failed to fetch assigned users');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An error occurred loading users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleStatusUpdate = async (userId: string, status: 'active' | 'locked' | 'flagged', reason?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const res = await fetch('/api/admin/users/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds: [userId], status, flagReason: reason })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Status updated to '${status}'`);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (err) {
      toast.error('An error occurred during status update');
    }
  };

  const handleDeposit = async (userId: string, userName: string) => {
    const amountStr = prompt(`Enter deposit amount to inject for ${userName}:`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const res = await fetch('/api/admin/users/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, amount })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Deposit processed successfully');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to process deposit');
      }
    } catch (err) {
      toast.error('An error occurred during deposit');
    }
  };

  const filtered = users
    .filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-muted-foreground" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  };

  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const flaggedCount = users.filter((u) => u.status === 'flagged').length;
  const pendingKyc = users.filter((u) => u.kycStatus === 'pending' || u.kycStatus === 'not_submitted').length;

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Assigned Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} users assigned · {flaggedCount} flagged · {pendingKyc} KYC pending
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="input-field pl-9 pr-4 py-2 text-sm w-52"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length.toString(), sub: 'Assigned to you', color: 'var(--primary)' },
          { label: 'Total Balance', value: `$${(totalBalance / 1000).toFixed(1)}k`, sub: 'Across all users', color: 'var(--success)' },
          { label: 'Flagged', value: flaggedCount.toString(), sub: 'Require attention', color: 'var(--danger)' },
          { label: 'KYC Pending', value: pendingKyc.toString(), sub: 'Awaiting review', color: 'var(--warning)' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 card-glow">
            <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
            <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: 'User', key: 'name' as SortKey },
                  { label: 'Grade', key: null },
                  { label: 'KYC', key: null },
                  { label: 'Status', key: null },
                  { label: 'Total Deposited', key: 'totalDeposited' as SortKey },
                  { label: 'Balance', key: 'balance' as SortKey },
                  { label: 'Risk', key: 'riskScore' as SortKey },
                  { label: 'Last Active', key: null },
                  { label: 'Actions', key: null },
                ].map((col) => (
                  <th
                    key={`ucol-${col.label}`}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.key ? (
                      <button className="flex items-center gap-1.5 hover:text-foreground transition-colors" onClick={() => handleSort(col.key!)}>
                        {col.label} <SortIcon col={col.key} />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-sm font-semibold">Loading assigned users...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No users assigned to you.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="table-row-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
                          >
                            {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground whitespace-nowrap">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
                        >
                          {user.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3"><KycBadge kycStatus={user.kycStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                      <td className="px-4 py-3 font-mono-nums text-sm text-foreground">${user.totalDeposited.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono-nums text-sm font-semibold text-foreground">${user.balance.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          user.riskScore >= 60 ? 'status-flagged' : user.riskScore >= 30 ? 'status-pending' : 'status-active'
                        }`}>
                          {user.riskScore >= 60 ? 'High' : user.riskScore >= 30 ? 'Med' : 'Low'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{user.joined}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                            className="btn-ghost p-1.5"
                            aria-label="View user details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => toast.success(`Message sent to ${user.name}`)}
                            className="btn-ghost p-1.5"
                            aria-label="Message user"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            onClick={() => toast.info(`KYC review opened for ${user.name}`)}
                            className="btn-ghost p-1.5"
                            aria-label="Review KYC"
                          >
                            <FileCheck size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedUser === user.id && (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 bg-muted/30">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 slide-up">
                            {[
                              { label: 'User ID', value: user.id },
                              { label: 'Joined', value: user.joined },
                              { label: 'Total Deposited', value: `$${user.totalDeposited.toLocaleString()}` },
                              { label: 'Current Balance', value: `$${user.balance.toLocaleString()}` },
                            ].map((item) => (
                              <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                                <div className="text-sm font-semibold text-foreground font-mono-nums">{item.value}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={() => handleDeposit(user.id, user.name)}
                              className="btn-secondary text-xs px-3 py-1.5"
                            >
                              Update Balance
                            </button>
                            <button
                              onClick={() => toast.info(`Asset migration initiated for ${user.name}`)}
                              className="btn-secondary text-xs px-3 py-1.5"
                            >
                              Migrate Assets
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => handleStatusUpdate(user.id, 'locked')}
                                className="text-xs px-3 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
                              >
                                Lock Account
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusUpdate(user.id, 'active')}
                                className="text-xs px-3 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}
                              >
                                Unlock Account
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <span className="text-sm text-muted-foreground">{filtered.length} of {users.length} users</span>
        </div>
      </div>
    </div>
  );
}
