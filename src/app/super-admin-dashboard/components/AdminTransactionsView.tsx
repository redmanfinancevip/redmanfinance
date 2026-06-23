'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, CheckCircle2, XCircle, Clock, 
  ArrowUpRight, ArrowDownRight, Loader2, RefreshCw, HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface TransactionRecord {
  id: string;
  user: string;
  email: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  asset: string;
  grade: string;
  risk: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'approved' | 'rejected';
  subadmin?: string;
  date: string;
  note?: string;
}

export default function AdminTransactionsView() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [processing, setProcessing] = useState<string | null>(null);

  // Rejection Modal Interface Context State
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [activeTargetTx, setActiveTargetTx] = useState<TransactionRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const url = new URL('/api/admin/transactions', window.location.origin);
      url.searchParams.append('status', statusFilter);
      url.searchParams.append('type', typeFilter);
      if (search.trim()) {
        url.searchParams.append('search', search.trim());
      }

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setTransactions(data.transactions || []);
      } else {
        toast.error(data.error || 'Failed to sync ledger matrix arrays');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network exception calling accounting sync endpoints');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, typeFilter]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchTransactions();
    }
  };

  const handleApproveAction = async (tx: TransactionRecord) => {
    setProcessing(tx.id);
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
        body: JSON.stringify({ txId: tx.id, action: 'approve', rejectionReason: '' })
      });

      if (res.ok) {
        toast.success(`Cleared $${tx.amount.toLocaleString()} for account allocation`);
        fetchTransactions();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Authorization mutation failed');
      }
    } catch (err) {
      toast.error('Internal processing execution barrier hit');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectModal = (tx: TransactionRecord) => {
    setActiveTargetTx(tx);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectActionSubmit = async () => {
    if (!activeTargetTx) return;
    const finalReason = rejectionReason.trim() || 'Declined under standard audit compliance';
    const txId = activeTargetTx.id;

    setRejectModalOpen(false);
    setProcessing(txId);
    
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
        body: JSON.stringify({ txId, action: 'reject', rejectionReason: finalReason })
      });

      if (res.ok) {
        toast.warning('Transaction flag marked as rejected; audit logging updated');
        fetchTransactions();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to commit ledger correction drop');
      }
    } catch (err) {
      toast.error('System error recording rejection parameters');
    } finally {
      setProcessing(null);
      setActiveTargetTx(null);
    }
  };

  return (
    <div className="space-y-5 fade-in relative">
      
      {/* Structural Headers and Quick Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Transactions & Approvals</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {transactions.filter((t) => t.status === 'pending').length} items awaiting confirmation &middot; Clearings &ge; $10,000 auto-trigger multi-sig validation rules
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              placeholder="Search user, ID or hash..."
              className="w-full sm:w-56 bg-muted/50 text-xs text-foreground pl-9 pr-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>
          <button 
            onClick={fetchTransactions}
            className="p-2 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl border border-border/40 transition-all"
            title="Reload ledger lines"
          >
            <RefreshCw size={14} />
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-muted/50 text-xs text-foreground px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-muted/50 text-xs text-foreground px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
          >
            <option value="all">All Channels</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Table Frame View */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['TX ID', 'Account Holder', 'Direction', 'Value', 'Asset Unit', 'Grade', 'Risk Profiler', 'Status State', 'Operator Pin', 'Timestamp Log', 'Action Row Controls'].map((col) => (
                  <th key={`txhead-${col}`} className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-xs font-bold uppercase tracking-wider">Compiling platform entry segments...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-xs font-medium text-muted-foreground">
                    No corresponding transaction entries matching current query paths inside platform schemas.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/10 transition-colors duration-100">
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground tracking-tight">
                      {tx.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-bold text-foreground">{tx.user}</div>
                      <div className="text-[11px] text-muted-foreground font-medium">{tx.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {tx.type === 'deposit' ? (
                          <span className="text-green-500 bg-green-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <ArrowDownRight size={12} /> Credit
                          </span>
                        ) : (
                          <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <ArrowUpRight size={12} /> Debit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-mono text-xs font-bold ${tx.amount >= 10000 ? 'text-red-500 underline decoration-wavy decoration-red-500/30' : 'text-foreground'}`}>
                        ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-muted-foreground/80 uppercase">{tx.asset}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-mono font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}>
                        {tx.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        tx.risk === 'high' ? 'bg-red-500/10 text-red-500' : tx.risk === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'
                      }`}>
                        {tx.risk} Risk
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        tx.status === 'completed' || tx.status === 'approved' ? 'bg-green-500/10 text-green-500' : tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {tx.status === 'pending' && <Clock size={11} className="animate-pulse" />}
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-medium text-muted-foreground">{tx.subadmin || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground/70 whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tx.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          {processing === tx.id ? (
                            <Loader2 className="animate-spin text-primary" size={14} />
                          ) : (
                            <>
                              <button
                                onClick={() => handleApproveAction(tx)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg text-xs font-bold transition-all border border-green-500/20"
                              >
                                <CheckCircle2 size={12} /> Confirm
                              </button>
                              <button
                                onClick={() => openRejectModal(tx)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all border border-red-500/20"
                              >
                                <XCircle size={12} /> Drop
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium italic block max-w-[140px] truncate" title={tx.note}>
                          {tx.note || 'No audit logs attached'}
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

      {/* Fully Encapsulated Custom Auditing Rejection Dialog Tray */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Reject Clearing Transaction</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assigning validation failure reason to transaction sequence row for user <strong className="text-foreground">{activeTargetTx?.user}</strong>.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Compliance / Rejection Log Details</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specify violation or matching compliance rule breach context..."
                className="w-full bg-muted/60 text-xs text-foreground p-3 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary h-24 resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 text-xs font-bold">
              <button 
                onClick={() => { setRejectModalOpen(false); setActiveTargetTx(null); }}
                className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectActionSubmit}
                className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-sm"
              >
                Confirm Drop Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}