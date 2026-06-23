'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Shield, User, DollarSign, Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Strict type definition for audit log structures
export interface AuditLog {
  id: string;
  event: string;
  category: 'transaction' | 'user' | 'vault' | 'earnings' | 'plan' | 'settings';
  actor: string;
  target: string;
  amount: string | number;
  ip: string;
  eventTime: string;
}

const categoryIcons: Record<AuditLog['category'], React.ElementType> = {
  transaction: DollarSign,
  user: User,
  vault: Shield,
  earnings: FileText,
  plan: Settings,
  settings: Settings,
};

const categoryColors: Record<AuditLog['category'], string> = {
  transaction: 'text-primary',
  user: 'text-info',
  vault: 'text-warning',
  earnings: 'text-success',
  plan: 'text-muted-foreground',
  settings: 'text-muted-foreground',
};

export default function AdminAuditView() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // Passing filters directly to the API endpoint to prepare for server-side processing
      const queryParams = new URLSearchParams({
        category: catFilter,
        search: search.trim()
      });

      const res = await fetch(`/api/admin/audit?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAuditLogs(data.auditLogs || []);
      } else {
        toast.error(data.error || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Audit view fetch failure:', err);
      toast.error('An error occurred loading audit logs');
    } finally {
      setLoading(false);
    }
  }, [catFilter, search]);

  // Debounced/Triggered side-effect to query logs when filter configurations shift
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Fallback client-side safety filter
  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch =
      log.event.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || log.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Audit Log</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable event log. All destructive and financial actions are permanently recorded.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="input-field pl-9 pr-4 py-2 text-sm w-52"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="input-field px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="transaction">Transactions</option>
            <option value="user">Users</option>
            <option value="vault">Vault</option>
            <option value="earnings">Earnings</option>
            <option value="plan">Plans</option>
            <option value="settings">Settings</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Event', 'Category', 'Actor', 'Target', 'Amount', 'IP Address', 'Timestamp'].map((col) => (
                  <th
                    key={`alcol-${col}`}
                    className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-sm font-semibold">Loading audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const IconComponent = categoryIcons[log.category] || FileText;
                  const colorClass = categoryColors[log.category] || 'text-muted-foreground';
                  return (
                    <tr key={log.id} className="table-row-hover transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-bold text-foreground">{log.event}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colorClass}`}>
                          <IconComponent size={12} />
                          <span className="capitalize">{log.category}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-foreground">{log.actor}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{log.target}</td>
                      <td className="px-5 py-3 font-mono-nums text-sm font-semibold text-foreground">
                        {log.amount}
                      </td>
                      <td className="px-5 py-3 font-mono-nums text-xs text-muted-foreground">
                        {log.ip}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.eventTime}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}