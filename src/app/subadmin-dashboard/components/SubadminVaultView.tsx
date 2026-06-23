'use client';

import React, { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, AlertTriangle, RefreshCw, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function SubadminVaultView() {
  const [vaultData, setVaultData] = useState({
    balance: 0,
    currency: 'USD',
    lastRefill: 'Never',
    lastRefillAmount: 0,
    pendingDisbursements: 0,
    totalDisbursed: 0
  });
  const [vaultTransactions, setVaultTransactions] = useState<any[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [disburseTo, setDisburseTo] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disburseNote, setDisburseNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVaultAndUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // 1. Fetch Vault and Vault History
      const vaultRes = await fetch('/api/admin/vault', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const vaultDataJson = await vaultRes.json();
      
      // 2. Fetch Assigned Users
      const usersRes = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const usersDataJson = await usersRes.json();

      if (vaultRes.ok) {
        setVaultData(vaultDataJson.vault);
        setVaultTransactions(vaultDataJson.vaultTransactions || []);
      } else {
        toast.error(vaultDataJson.error || 'Failed to fetch vault balance');
      }

      if (usersRes.ok) {
        setAssignedUsers(usersDataJson.users || []);
      } else {
        toast.error(usersDataJson.error || 'Failed to fetch assigned users');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred loading vault details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultAndUsers();
  }, []);

  const handleDisburse = async () => {
    const amount = parseFloat(disburseAmount);
    if (!disburseTo || !amount || amount <= 0) {
      toast.error('Please fill in all fields with valid values');
      return;
    }
    if (amount > availableBalance) {
      toast.error('Insufficient vault balance');
      return;
    }
    if (amount >= 10000) {
      toast.warning('Disbursements ≥$10k must be requested via Super Admin');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          disburseToName: disburseTo,
          amount: amount,
          note: disburseNote
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`$${amount.toLocaleString()} disbursed to ${disburseTo}`);
        setDisburseTo('');
        setDisburseAmount('');
        setDisburseNote('');
        fetchVaultAndUsers();
      } else {
        toast.error(data.error || 'Disbursement payout failed');
      }
    } catch (err) {
      toast.error('An error occurred during disbursement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableBalance = vaultData.balance - vaultData.pendingDisbursements;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="text-sm font-semibold text-muted-foreground">Loading vault records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Sub-Vault Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Internal vault funded by Super Admin · No external withdrawals</p>
      </div>

      {/* Restriction Notice */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Restricted Vault</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This vault is for internal disbursements to your assigned users only. You cannot view Super Admin wallets, perform external withdrawals, or transfer to other subadmins. Disbursements ≥$10k are automatically escalated to Super Admin.
          </p>
        </div>
      </div>

      {/* Vault Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Vault Balance', value: `$${vaultData.balance.toLocaleString()}`, sub: vaultData.currency, color: 'var(--primary)', icon: '💰' },
          { label: 'Available', value: `$${availableBalance.toLocaleString()}`, sub: 'After pending', color: 'var(--success)', icon: '✅' },
          { label: 'Pending', value: `$${vaultData.pendingDisbursements.toLocaleString()}`, sub: 'Awaiting processing', color: 'var(--warning)', icon: '⏳' },
          { label: 'Total Disbursed', value: `$${(vaultData.totalDisbursed / 1000).toFixed(1)}k`, sub: 'All time', color: 'var(--muted-foreground)', icon: '📤' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 card-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <span className="text-base">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold font-mono-nums" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disburse Form */}
        <div className="rounded-xl border border-border bg-card p-5 card-glow">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-primary" />
            Disburse to User
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Select User</label>
              <select
                value={disburseTo}
                onChange={(e) => setDisburseTo(e.target.value)}
                className="input-field w-full px-3 py-2.5 text-sm"
              >
                <option value="">— Choose assigned user —</option>
                {assignedUsers.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount (USD)</label>
              <input
                type="number"
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                max="9999"
                className="input-field w-full px-3 py-2.5 text-sm font-mono-nums"
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Info size={11} />
                Max $9,999 per transaction. ≥$10k must be routed via Super Admin.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Note (optional)</label>
              <input
                type="text"
                value={disburseNote}
                onChange={(e) => setDisburseNote(e.target.value)}
                placeholder="e.g. Balance credit, earnings payout..."
                className="input-field w-full px-3 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={handleDisburse}
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><RefreshCw size={14} className="animate-spin" /> Processing...</>
              ) : (
                <><ArrowUpRight size={14} /> Disburse Funds</>
              )}
            </button>
          </div>
        </div>

        {/* Vault Info */}
        <div className="rounded-xl border border-border bg-card p-5 card-glow">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Info size={16} className="text-primary" />
            Vault Details
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Last Refill', value: vaultData.lastRefill },
              { label: 'Last Refill Amount', value: `$${vaultData.lastRefillAmount.toLocaleString()} ${vaultData.currency}` },
              { label: 'Vault Currency', value: vaultData.currency },
              { label: 'Pending Disbursements', value: `$${vaultData.pendingDisbursements.toLocaleString()}` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground font-mono-nums">{item.value}</span>
              </div>
            ))}
            <div
              className="mt-3 p-3 rounded-lg text-xs"
              style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--info)' }}
            >
              To request a vault refill, contact your Super Admin. Refills are processed within 24 hours.
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Vault Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['TX ID', 'Type', 'Amount', 'Note', 'Date', 'Status'].map((col) => (
                  <th key={`vcol-${col}`} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vaultTransactions.map((tx) => (
                <tr key={tx.id} className="table-row-hover transition-colors">
                  <td className="px-4 py-3 font-mono-nums text-xs text-muted-foreground">{tx.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {tx.type === 'refill'
                        ? <ArrowDownRight size={13} className="text-success" />
                        : <ArrowUpRight size={13} className="text-danger" />
                      }
                      <span className="text-sm capitalize text-foreground">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono-nums text-sm font-bold text-foreground">${tx.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{tx.note}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                      tx.status === 'completed' ? 'status-active' : 'status-pending'
                    }`}>
                      {tx.status === 'pending' && <Clock size={10} />}
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
