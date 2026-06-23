'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Plus, AlertCircle, CheckCircle2, Loader2, X, Wallet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface WalletAsset {
  id: string;
  asset: string;
  network: string;
  address: string;
  balance: number;
  usdValue: number;
  color?: string;
  icon?: string;
}

interface SubadminVault {
  id: string;
  subadmin: string;
  email: string;
  balance: number;
  status: 'active' | 'low' | 'empty';
  assignedUsers: number;
  lastRefill: string;
}

export default function AdminWalletsView() {
  const [wallets, setWallets] = useState<WalletAsset[]>([]);
  const [subadminVaults, setSubadminVaults] = useState<SubadminVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refillAmount, setRefillAmount] = useState<Record<string, string>>({});
  const [refillingId, setRefillingId] = useState<string | null>(null);

  // New Wallet form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWallet, setNewWallet] = useState({ asset: 'USDT', network: 'TRON (TRC-20)', address: '', balance: '', usdValue: '' });
  const [addingWallet, setAddingWallet] = useState(false);

  // Helper to dynamically assign fallback styles to runtime database targets
  const getAssetStyle = (asset: string) => {
    const targets: Record<string, { color: string; icon: string }> = {
      BTC: { color: '#F7931A', icon: '₿' },
      ETH: { color: '#627EEA', icon: 'Ξ' },
      USDT: { color: '#26A17B', icon: '₮' },
      USDC: { color: '#2775CA', icon: '$' },
    };
    return targets[asset.toUpperCase()] || { color: 'var(--primary)', icon: '◈' };
  };

  const fetchWalletsData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/wallets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        setWallets(data.wallets || []);
        setSubadminVaults(data.subadminVaults || []);
      } else {
        toast.error(data.error || 'Failed to fetch wallets data');
      }
    } catch (err) {
      console.error('Fetch ledger error:', err);
      toast.error('An error occurred loading live ledger wallets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletsData();

    // Listen to updates triggered by other dashboard views
    const handleGlobalRefresh = () => fetchWalletsData(true);
    window.addEventListener('wallet-update', handleGlobalRefresh);
    return () => window.removeEventListener('wallet-update', handleGlobalRefresh);
  }, []);

  // Sync balances across different dashboard elements or charts natively
  const broadcastWalletChange = () => {
    window.dispatchEvent(new Event('wallet-update'));
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    toast.success('Address copied to clipboard');
  };

  const handleRefill = async (vaultId: string, subadmin: string) => {
    const amountStr = refillAmount[vaultId] ?? '0';
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid refill allocation amount');
      return;
    }

    setRefillingId(vaultId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/wallets/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vaultId, amount })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`$${amount.toLocaleString()} successfully assigned to ${subadmin}'s vault`);
        setRefillAmount((prev) => ({ ...prev, [vaultId]: '' }));
        fetchWalletsData(true);
        broadcastWalletChange(); // Notify listening global visual cards instantly
      } else {
        toast.error(data.error || 'Failed to settle vault allocation adjustment');
      }
    } catch (err) {
      toast.error('Network transaction allocation runtime failure');
    } finally {
      setRefillingId(null);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet.address.trim()) {
      toast.error('Valid wallet network destination address required');
      return;
    }

    setAddingWallet(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          asset: newWallet.asset,
          network: newWallet.network,
          address: newWallet.address,
          balance: Number(newWallet.balance || 0),
          usdValue: Number(newWallet.usdValue || 0)
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('New active core deposit destination address stored');
        setIsAddModalOpen(false);
        setNewWallet({ asset: 'USDT', network: 'TRON (TRC-20)', address: '', balance: '', usdValue: '' });
        fetchWalletsData(true);
        broadcastWalletChange();
      } else {
        toast.error(data.error || 'Failed to commit ledger creation');
      }
    } catch (err) {
      toast.error('Database connection runtime drop saving record');
    } finally {
      setAddingWallet(false);
    }
  };

  const totalVaultUSD = wallets.reduce((sum, w) => sum + (Number(w.usdValue) || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="text-sm font-semibold text-muted-foreground">Syncing real-time ledger records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Wallet size={20} className="text-primary" />
            Wallets & Core Cryptographic Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Super Admin isolated entry points. Completely protected from subordinate client visibility paths.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchWalletsData(true)}
          disabled={refreshing}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-card transition-all"
          title="Force update data sync"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      {/* Aggregate Metrics Panel */}
      <div
        className="flex items-center justify-between p-5 rounded-xl"
        style={{ background: 'linear-gradient(135deg, rgba(232,80,10,0.08) 0%, rgba(255,107,53,0.02) 100%)', border: '1px solid rgba(232,80,10,0.2)' }}
      >
        <div>
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Main Treasury Value</div>
          <div className="font-mono-nums text-3xl font-extrabold text-foreground tracking-tight">
            ${totalVaultUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-medium">
            Aggregated dynamically from <span className="text-foreground font-bold">{wallets.length}</span> connected database entries
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="live-indicator bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Live DB Stream</span>
          </div>
        </div>
      </div>

      {/* Primary Settlement Inputs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">Active Operational Channels</h3>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
          >
            <Plus size={14} />
            Append Destination
          </button>
        </div>
        
        {wallets.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border bg-card text-muted-foreground text-sm">
            No active collection pathways detected in database collections.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets.map((w) => {
              const styleMeta = getAssetStyle(w.asset);
              return (
                <div key={w.id} className="rounded-xl border border-border bg-card p-5 hover-lift transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-extrabold select-none"
                        style={{ backgroundColor: `${styleMeta.color}15`, color: styleMeta.color }}
                      >
                        {w.icon || styleMeta.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{w.asset}</div>
                        <div className="text-xs text-muted-foreground font-medium">{w.network}</div>
                      </div>
                    </div>
                    <span className="status-active inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 size={10} />
                      Connected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wide">Ledger Balance</div>
                      <div className="font-mono-nums text-sm font-bold text-foreground truncate">
                        {Number(w.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} {w.asset}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wide">USD Equivalence</div>
                      <div className="font-mono-nums text-sm font-bold text-foreground">
                        ${Number(w.usdValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted border border-border">
                    <span className="font-mono-nums text-xs text-muted-foreground flex-1 truncate select-all px-1">{w.address}</span>
                    <button
                      onClick={() => copyAddress(w.address)}
                      className="btn-ghost p-1.5 shrink-0 hover:bg-card rounded-md transition-colors"
                      aria-label="Copy crypto address"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subadmin Allocation Vault Matrix */}
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-4">Internal Allocation Vaults</h3>
        <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 bg-blue-500/5 border border-blue-500/15">
          <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600/90 leading-relaxed">
            Internal administrative allocation parameters. Desk handlers interact completely within assigned software bounds without direct systemic backend keys exposure.
          </p>
        </div>

        {subadminVaults.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border bg-card text-muted-foreground text-sm">
            No active subadmin desks provisioned.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subadminVaults.map((vault) => (
              <div
                key={vault.id}
                className={`rounded-xl border bg-card p-5 transition-all ${
                  vault.status === 'empty' ? 'border-red-500/30 shadow-xs shadow-red-500/5' : vault.status === 'low' ? 'border-amber-500/30 shadow-xs shadow-amber-500/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-foreground tracking-tight">{vault.subadmin}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[160px]">{vault.email}</div>
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                    vault.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : vault.status === 'low' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                  }`}>
                    {vault.status}
                  </span>
                </div>

                <div className="font-mono-nums text-2xl font-extrabold text-foreground tracking-tight mb-1">
                  ${Number(vault.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-muted-foreground mb-4 font-medium">
                  {vault.assignedUsers || 0} clients • Refilled: {vault.lastRefill || 'Never'}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    value={refillAmount[vault.id] ?? ''}
                    onChange={(e) => setRefillAmount((prev) => ({ ...prev, [vault.id]: e.target.value }))}
                    placeholder="Refill USD"
                    className="input-field flex-1 px-3 py-1.5 text-xs font-mono-nums"
                    min={1}
                  />
                  <button
                    onClick={() => handleRefill(vault.id, vault.subadmin)}
                    disabled={refillingId === vault.id}
                    className="btn-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    {refillingId === vault.id ? 'Settling...' : 'Refill'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Wallet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 transition-colors rounded-lg"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold text-foreground mb-4 uppercase tracking-wider text-muted-foreground">Register Target Channel</h3>
            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Asset Token Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USDT"
                  value={newWallet.asset}
                  onChange={(e) => setNewWallet({ ...newWallet, asset: e.target.value.toUpperCase() })}
                  className="input-field w-full px-3 py-2 text-sm font-semibold tracking-wide"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Network Standard Parameters</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRON (TRC-20)"
                  value={newWallet.network}
                  onChange={(e) => setNewWallet({ ...newWallet, network: e.target.value })}
                  className="input-field w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cryptographic Target Address</label>
                <input
                  type="text"
                  required
                  placeholder="0x... or T..."
                  value={newWallet.address}
                  onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value.trim() })}
                  className="input-field w-full px-3 py-2 text-sm font-mono-nums"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Starting Units</label>
                  <input
                    type="number"
                    step="any"
                    value={newWallet.balance}
                    onChange={(e) => setNewWallet({ ...newWallet, balance: e.target.value })}
                    className="input-field w-full px-3 py-2 text-sm font-mono-nums"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Fiat Valuation (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={newWallet.usdValue}
                    onChange={(e) => setNewWallet({ ...newWallet, usdValue: e.target.value })}
                    className="input-field w-full px-3 py-2 text-sm font-mono-nums"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={addingWallet}
                className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider mt-2"
              >
                {addingWallet ? 'Writing to cluster...' : 'Commit Vault Structure'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}