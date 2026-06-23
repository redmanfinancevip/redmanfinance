'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Users, TrendingUp, Clock,
  Vault, UserPlus, AlertTriangle, CheckCircle2,
  XCircle, ArrowUpRight, ArrowDownRight,
  Zap, Activity, Loader2, MessageSquare, AlertCircle
} from 'lucide-react';
import AdminEarningsChart from './AdminEarningsChart';
import AdminVolumeChart from './AdminVolumeChart';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface AdminStats {
  totalAUM: number;
  pendingApprovals: number;
  todayEarnings: number;
  activeUsers: number;
  vaultBalance: number;
  newSignups: number;
  totalTransactions: number;
  flaggedUsers: number;
}

interface PendingTransaction {
  id: string;
  user: string;
  email: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  asset: string;
  risk: 'low' | 'medium' | 'high';
  submitted: string;
}

interface ActivityFeedItem {
  id: string;
  type: 'deposit' | 'approval' | 'kyc' | 'grade' | 'flag' | 'investment' | 'earnings' | 'vault';
  event: string;
  user: string;
  amount: string;
  time: string;
}

function RiskBadge({ risk }: { risk: PendingTransaction['risk'] }) {
  const map: Record<PendingTransaction['risk'], string> = {
    high: 'bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs font-semibold',
    medium: 'bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-xs font-semibold',
    low: 'bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs font-semibold',
  };
  return <span className={map[risk]}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>;
}

function ActivityIcon({ type }: { type: ActivityFeedItem['type'] }) {
  const map: Record<ActivityFeedItem['type'], { icon: React.ElementType; color: string }> = {
    deposit: { icon: ArrowDownRight, color: 'text-success' },
    approval: { icon: CheckCircle2, color: 'text-info' },
    kyc: { icon: CheckCircle2, color: 'text-success' },
    grade: { icon: TrendingUp, color: 'text-primary' },
    flag: { icon: AlertTriangle, color: 'text-danger' },
    investment: { icon: Zap, color: 'text-primary' },
    earnings: { icon: DollarSign, color: 'text-success' },
    vault: { icon: Vault, color: 'text-warning' },
  };
  const entry = map[type] ?? { icon: Activity, color: 'text-muted-foreground' };
  const Icon = entry.icon;
  return <Icon size={14} className={entry.color} />;
}

export default function AdminDashboardView() {
  const [stats, setStats] = useState<AdminStats>({
    totalAUM: 0,
    pendingApprovals: 0,
    todayEarnings: 0,
    activeUsers: 0,
    vaultBalance: 0,
    newSignups: 0,
    totalTransactions: 0,
    flaggedUsers: 0,
  });
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingTx, setProcessingTx] = useState<string | null>(null);
  
  // Custom Dynamic Administration Permission States
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [maxApprovalLimit, setMaxApprovalLimit] = useState<number | null>(null); // null means "limitless"

  // Rejection Modal UX Configuration states
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [targetRejectTx, setTargetRejectTx] = useState<{ id: string; user: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // Dynamically extract operational control settings from sub-admin profile metadata
      const userRole = session.user?.user_metadata?.role || 'sub-admin';
      const rawLimit = session.user?.user_metadata?.max_approval_limit; 
      
      setAdminRole(userRole);
      setMaxApprovalLimit(rawLimit ? Number(rawLimit) : null);

      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setStats(data.stats);
        setPendingTransactions(data.pendingTransactions || []);
        setActivityFeed(data.activityFeed || []);
      } else {
        toast.error(data.error || 'Failed to fetch admin statistics');
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      toast.error('Error fetching dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleApprove = async (txId: string, user: string, amount: number) => {
    // Dynamic Protection Enforcement Guard
    if (maxApprovalLimit !== null && amount > maxApprovalLimit) {
      toast.error(`Access Denied: Your administrative layout profile is capped at $${maxApprovalLimit.toLocaleString()} settlements.`);
      return;
    }

    setProcessingTx(txId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/transactions/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ txId, action: 'approve' })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Approved $${amount.toLocaleString()} transaction for ${user}`);
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to approve transaction');
      }
    } catch (err) {
      toast.error('An error occurred during approval process');
    } finally {
      setProcessingTx(null);
    }
  };

  const openRejectionFlow = (txId: string, user: string) => {
    setTargetRejectTx({ id: txId, user });
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectCommit = async () => {
    if (!targetRejectTx) return;
    const finalReason = rejectionReason.trim() || 'Administrative adjustment reversal';

    setProcessingTx(targetRejectTx.id);
    setRejectModalOpen(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/transactions/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ txId: targetRejectTx.id, action: 'reject', rejectionReason: finalReason })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.warning(`Rejected transaction for ${targetRejectTx.user} — added to audit ledger.`);
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to complete rejection protocol');
      }
    } catch (err) {
      toast.error('An error occurred during transaction processing rejection');
    } finally {
      setProcessingTx(null);
      setTargetRejectTx(null);
    }
  };

  const kpiCards = [
    {
      id: 'kpi-aum',
      label: 'Platform AUM',
      value: `$${(stats.totalAUM / 1000000).toFixed(2)}M`,
      sub: 'Active deposits & assets managed',
      icon: DollarSign,
      positive: true,
      span: 2,
      bgStyle: 'rgba(232,80,10,0.06)',
      glowClass: 'card-glow-primary',
    },
    {
      id: 'kpi-pending',
      label: 'Pending Approvals',
      value: String(stats.pendingApprovals),
      sub: stats.pendingApprovals > 0 ? 'Urgent verification queued' : 'All transaction queues cleared',
      icon: Clock,
      positive: stats.pendingApprovals === 0,
      span: 1,
      bgStyle: stats.pendingApprovals > 0 ? 'rgba(239,68,68,0.08)' : 'var(--card)',
      glowClass: stats.pendingApprovals > 0 ? 'card-glow-danger' : '',
    },
    {
      id: 'kpi-earnings',
      label: "Today's Yield Accrued",
      value: `$${Number(stats.todayEarnings).toLocaleString()}`,
      sub: 'Accrued across active plans',
      icon: TrendingUp,
      positive: true,
      span: 1,
      bgStyle: 'rgba(34,197,94,0.06)',
      glowClass: 'card-glow-success',
    },
    {
      id: 'kpi-users',
      label: 'Active System Users',
      value: Number(stats.activeUsers).toLocaleString(),
      sub: `${stats.flaggedUsers} accounts flagged risk`,
      icon: Users,
      positive: stats.flaggedUsers === 0,
      span: 1,
      bgStyle: 'var(--card)',
      glowClass: '',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="text-sm font-semibold text-muted-foreground">Loading dashboard environment...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in relative">
      
      {/* High-Risk Pipeline Alerts */}
      {pendingTransactions.some((t) => t.risk === 'high') && (
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-red-500/10 border-red-500/20">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-red-500">High-risk execution requests require supervisor clearance</span>
            <span className="text-xs text-muted-foreground ml-2">
              Review transaction velocity fields carefully before committing updates.
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-600 text-white animate-pulse">CRITICAL</span>
        </div>
      )}

      {/* KPI Bento Stream Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`rounded-xl p-5 border border-border hover-lift ${card.span === 2 ? 'col-span-2' : 'col-span-1'} ${card.glowClass}`}
              style={{ backgroundColor: card.bgStyle }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5">
                  <Icon size={18} className={card.positive ? 'text-primary' : 'text-red-500'} />
                </div>
              </div>
              <div className="font-mono-nums text-2xl font-bold text-foreground mb-1">{card.value}</div>
              <div className="text-xs text-muted-foreground font-medium mb-1">{card.label}</div>
              <div className={`text-xs font-medium ${card.positive ? 'text-green-500' : 'text-red-500'}`}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Analytics Visualization Engine Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Yield Ledger Accumulations</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Yield history distribution</p>
            </div>
          </div>
          <AdminEarningsChart />
        </div>
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">Deposit Volume Matrix (14d)</h3>
          </div>
          <AdminVolumeChart />
        </div>
      </div>

      {/* Dynamic Processing Table Pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Operational Execution Queue</h3>
            {maxApprovalLimit !== null && (
              <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-md flex items-center gap-1">
                <AlertCircle size={12} /> Capped approval threshold: ${maxApprovalLimit.toLocaleString()}
              </span>
            )}
          </div>

          {pendingTransactions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No verification requests active.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground uppercase">
                    {['Account Name', 'Direction', 'Value Balance', 'Asset Base', 'Risk', 'Received', 'Actions'].map((c) => (
                      <th key={c} className="px-4 py-3 text-left whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingTransactions.map((tx) => {
                    const isLocked = maxApprovalLimit !== null && tx.amount > maxApprovalLimit;
                    return (
                      <tr key={tx.id} className="table-row-hover transition-colors text-sm">
                        <td className="px-4 py-3 font-medium text-foreground">{tx.user}<div className="text-xs text-muted-foreground">{tx.email}</div></td>
                        <td className="px-4 py-3 capitalize">{tx.type}</td>
                        <td className="px-4 py-3 font-mono font-semibold">${tx.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{tx.asset}</td>
                        <td className="px-4 py-3"><RiskBadge risk={tx.risk} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{tx.submitted}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {processingTx === tx.id ? (
                              <span className="text-xs text-muted-foreground">Writing Ledger...</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleApprove(tx.id, tx.user, tx.amount)}
                                  disabled={isLocked}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                  title={isLocked ? "Exceeds administrative capacity constraints" : ""}
                                >
                                  Commit
                                </button>
                                <button
                                  onClick={() => openRejectionFlow(tx.id, tx.user)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                >
                                  Rollback
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Engine Actions Timeline Stream */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">System Engine Events</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activityFeed.map((item) => (
              <div key={item.id} className="text-xs flex gap-3 border-b border-border/40 pb-2">
                <ActivityIcon type={item.type} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.event}</p>
                  <p className="text-muted-foreground text-[11px]">{item.user} • {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CUSTOM SOLID REJECTION MODAL COMPONENT LAYER */}
      {rejectModalOpen && targetRejectTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-red-500">
              <XCircle size={22} />
              <h3 className="text-base font-bold text-foreground">Reject & Revert Execution Step</h3>
            </div>
            
            <p className="text-xs text-muted-foreground">
              You are flagging a rolling request submitted by <strong className="text-foreground">{targetRejectTx.user}</strong>. Provide an administrative tracking statement below:
            </p>

            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 text-muted-foreground" size={16} />
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Missing verification hashes, unauthorized risk variance detected..."
                className="w-full bg-muted/30 text-sm rounded-xl pl-9 pr-4 py-2.5 min-h-[100px] border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectCommit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-all shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}