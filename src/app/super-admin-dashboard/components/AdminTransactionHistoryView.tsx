'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, Filter, ChevronDown, Loader2, 
  ArrowDownRight, ArrowUpRight, Calendar, User, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface TransactionAudit {
  id: string;
  user: string;
  email: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  adminName: string;
  reason?: string;
  timestamp: string;
  backdated: boolean;
  originalTimestamp?: string;
}

export default function AdminTransactionHistoryView() {
  const [transactions, setTransactions] = useState<TransactionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'user'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const url = new URL('/api/admin/audit-transactions', window.location.origin);
      if (typeFilter !== 'all') url.searchParams.append('type', typeFilter);
      if (search.trim()) url.searchParams.append('search', search.trim());
      if (dateFrom) url.searchParams.append('dateFrom', dateFrom);
      if (dateTo) url.searchParams.append('dateTo', dateTo);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
      } else {
        toast.error(data.error || 'Failed to fetch transaction history');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error fetching transaction history');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, dateFrom, dateTo]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchTransactions();
    }
  };

  const sorted = [...transactions].sort((a, b) => {
    let aVal: any = a[sortBy as keyof TransactionAudit];
    let bVal: any = b[sortBy as keyof TransactionAudit];
    
    if (sortBy === 'date') {
      aVal = new Date(a.timestamp).getTime();
      bVal = new Date(b.timestamp).getTime();
    }
    
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleExportCSV = () => {
    if (sorted.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'User', 'Email', 'Type', 'Amount', 'Admin', 'Reason', 'Backdated'];
    const rows = sorted.map(t => [
      new Date(t.timestamp).toLocaleString(),
      t.user,
      t.email,
      t.type.toUpperCase(),
      `$${t.amount.toLocaleString()}`,
      t.adminName,
      t.reason || '-',
      t.backdated ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h2 className="text-xl font-bold text-foreground">Transaction History & Audit</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Complete log of all manual balance adjustments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Deposits</p>
              <p className="text-2xl font-bold text-success mt-1">${totalDeposits.toLocaleString()}</p>
            </div>
            <ArrowDownRight size={24} className="text-success" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Withdrawals</p>
              <p className="text-2xl font-bold text-danger mt-1">${totalWithdrawals.toLocaleString()}</p>
            </div>
            <ArrowUpRight size={24} className="text-danger" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold text-primary mt-1">{transactions.length}</p>
            </div>
            <DollarSign size={24} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Search User or Email</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Search..."
                className="input-field w-full pl-9 pr-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits Only</option>
              <option value="withdrawal">Withdrawals Only</option>
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-muted-foreground mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-muted-foreground mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: 'Date', key: 'date' as const },
                  { label: 'User', key: 'user' as const },
                  { label: 'Type', key: null },
                  { label: 'Amount', key: 'amount' as const },
                  { label: 'Admin', key: null },
                  { label: 'Reason', key: null },
                  { label: 'Backdated', key: null }
                ].map((col) => (
                  <th
                    key={`col-${col.label}`}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.key ? (
                      <button
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                        onClick={() => {
                          if (sortBy === col.key) {
                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(col.key);
                            setSortDir('desc');
                          }
                        }}
                      >
                        {col.label}
                        <ChevronDown size={12} className={`transition-transform ${sortBy === col.key && sortDir === 'asc' ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="animate-spin" size={24} />
                      <span className="text-sm">Loading transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                sorted.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">{tx.user}</div>
                        <div className="text-xs text-muted-foreground">{tx.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                        tx.type === 'deposit'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}>
                        {tx.type === 'deposit' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold">
                      <span className={tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tx.adminName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tx.reason || '-'}</td>
                    <td className="px-4 py-3">
                      {tx.backdated ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-warning/10 text-warning">
                          ⏮ Yes
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
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
