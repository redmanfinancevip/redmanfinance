'use client';

import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownRight, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function SubadminTransactionsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const url = new URL('/api/admin/transactions', window.location.origin);
      url.searchParams.append('status', statusFilter);
      url.searchParams.append('type', typeFilter);
      url.searchParams.append('search', search);

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
      } else {
        toast.error(data.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred loading transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, typeFilter]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchTransactions();
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject', user: string, amount: number) => {
    setProcessing(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      let rejectionReason = '';
      if (action === 'reject') {
        rejectionReason = prompt('Enter rejection reason:') || 'Rejection by Subadmin';
      }

      const res = await fetch('/api/admin/transactions/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txId: id,
          action,
          rejectionReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (action === 'approve') {
          toast.success(`Approved $${amount.toLocaleString()} for ${user}`);
        } else {
          toast.error(`Rejected transaction for ${user} — logged`);
        }
        fetchTransactions();
      } else {
        toast.error(data.error || 'Failed to process transaction');
      }
    } catch (err) {
      toast.error('An error occurred during transaction update');
    } finally {
      setProcessing(null);
    }
  };

  // Separate standard approvals (< 10k) and escalated (>= 10k)
  const manageableTransactions = transactions.filter((t) => t.amount < 10000);
  const escalatedTransactions = transactions.filter((t) => t.amount >= 10000);

  const pendingCount = manageableTransactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Transaction Approvals</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendingCount} pending · Auto-approve scope: transactions under $10,000
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              placeholder="Search user or TX ID (Enter)..."
              className="input-field pl-9 pr-4 py-2 text-sm w-60"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field px-3 py-2 text-sm">
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>
      </div>

      {/* Scope Notice */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
      >
        <Info size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--info)' }} />
        <p className="text-xs" style={{ color: 'var(--info)' }}>
          You can approve or reject transactions under <strong>$10,000</strong> for your assigned users. Transactions ≥$10k are automatically escalated to Super Admin and shown below for reference only.
        </p>
      </div>

      {/* Escalated Transactions (read-only) */}
      {escalatedTransactions.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <div
            className="px-5 py-3 flex items-center gap-2 border-b"
            style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
              Escalated to Super Admin ({escalatedTransactions.length})
            </span>
            <span className="text-xs text-muted-foreground ml-1">— Transactions ≥$10k · Read-only</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['TX ID', 'User', 'Type', 'Amount', 'Asset', 'Date', 'Escalated To'].map((col) => (
                    <th key={`ecol-${col}`} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {escalatedTransactions.map((tx) => (
                  <tr key={tx.id} className="opacity-70">
                    <td className="px-4 py-3 font-mono-nums text-xs text-muted-foreground">{tx.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm text-foreground">{tx.user}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {tx.type === 'deposit' ? <ArrowDownRight size={13} className="text-success" /> : <ArrowUpRight size={13} className="text-danger" />}
                        <span className="text-sm capitalize text-foreground">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono-nums text-sm font-bold text-danger">${tx.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tx.asset}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md status-pending">Super Admin</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standard Queue */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Standard Queue (Under $10,000)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['TX ID', 'User', 'Type', 'Amount', 'Asset', 'Grade', 'Risk', 'Status', 'Date', 'Actions'].map((col) => (
                  <th key={`scol-${col}`} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-sm font-semibold">Loading approvals...</span>
                    </div>
                  </td>
                </tr>
              ) : manageableTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                    No manageable transactions found.
                  </td>
                </tr>
              ) : (
                manageableTransactions.map((tx) => (
                  <tr key={tx.id} className="table-row-hover transition-colors">
                    <td className="px-4 py-3 font-mono-nums text-xs text-muted-foreground">{tx.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-foreground whitespace-nowrap">{tx.user}</div>
                      <div className="text-xs text-muted-foreground">{tx.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {tx.type === 'deposit' ? <ArrowDownRight size={13} className="text-success" /> : <ArrowUpRight size={13} className="text-danger" />}
                        <span className="text-sm capitalize text-foreground">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono-nums text-sm font-bold text-foreground">${tx.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tx.asset}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}>
                        {tx.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        tx.risk === 'high' ? 'status-flagged' : tx.risk === 'medium' ? 'status-pending' : 'status-active'
                      }`}>
                        {tx.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                        tx.status === 'completed' || tx.status === 'approved' ? 'status-active' : tx.status === 'pending' ? 'status-pending' : 'status-rejected'
                      }`}>
                        {tx.status === 'pending' && <Clock size={10} />}
                        {tx.status === 'completed' || tx.status === 'approved' ? 'Completed' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3">
                      {tx.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          {processing === tx.id ? (
                            <span className="text-xs text-muted-foreground">Processing...</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAction(tx.id, 'approve', tx.user, tx.amount)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                                style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}
                                aria-label="Approve transaction"
                              >
                                <CheckCircle2 size={11} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(tx.id, 'reject', tx.user, tx.amount)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                                style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
                                aria-label="Reject transaction"
                              >
                                <XCircle size={11} />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic truncate max-w-xs block" title={tx.note}>
                          {tx.note || 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
