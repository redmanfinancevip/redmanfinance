'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp, 
  Coins, 
  Fuel, 
  Building2, 
  Landmark, 
  Award, 
  Compass, 
  Clock, 
  ArrowUpRight, 
  X,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Profile, Investment } from '@/hooks/useRealtime';

// --- Extended Profile Type Matching Core Dashboard State Architecture ---
interface ExtendedProfile extends Profile {
  kyc_progress_percent?: number;
}

interface UserEarningsViewProps {
  profile: ExtendedProfile;
  investments: Investment[];
}

export default function UserEarningsView({ profile, investments }: UserEarningsViewProps) {
  const [hideBalances, setHideBalances] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [reinvestModalOpen, setReinvestModalOpen] = useState(false);
  const [submittingReinvest, setSubmittingReinvest] = useState(false);

  // Reinvestment Form State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [reinvestAmount, setReinvestAmount] = useState('');

  // Local state for live ticking animations
  const [liveCombinedEarnings, setLiveCombinedEarnings] = useState(0);
  const [liveIndividualEarnings, setLiveIndividualEarnings] = useState<{ [key: string]: number }>({});
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});

  const accruedBalance = Number(profile?.earnings_balance || 0);

  // Enforce validation flag mirroring the primary UserHomeView logic layout
  const accountAgeMonths = () => {
    const created = new Date(profile.created_at || '');
    const now = new Date();
    return (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  };
  
  const isVelocityBreached = !!profile.upgrade_required || (Number(profile.main_balance || 0) > 500000 && accountAgeMonths() < 5);

  // Asset configurations mapping for styling and iconography
  const assetMeta: { [key: string]: { color: string; icon: React.ReactNode } } = {
    'Digital Assets': { color: '#3B82F6', icon: <Coins size={14} /> },
    'Global Commodities': { color: '#E8500A', icon: <Fuel size={14} /> },
    'Premium Real Estate': { color: '#22C55E', icon: <Building2 size={14} /> },
    'Precious Metals': { color: '#F59E0B', icon: <Landmark size={14} /> },
    'High Technology': { color: '#A855F7', icon: <Award size={14} /> },
    'Global Trade Supply Chains': { color: '#06B6D4', icon: <Compass size={14} /> },
  };

  const activeInvestments = investments.filter(inv => inv.status === 'active');

  const plans = [
    { id: 'plan-crypto-alpha', name: 'Crypto Liquidity Matrix', sector: 'Digital Assets', min: 500 },
    { id: 'plan-crude-oil', name: 'Brent Crude Oil Futures', sector: 'Global Commodities', min: 3000 },
    { id: 'plan-real-estate', name: 'Metropolitan Commercial Equity', sector: 'Premium Real Estate', min: 1500 },
    { id: 'plan-gold-bullion', name: 'Sovereign Bullion Reserve', sector: 'Precious Metals', min: 5000 },
    { id: 'plan-tech-arbitrage', name: 'AI Cluster Computational Farms', sector: 'High Technology', min: 10000 },
  ];

  // Core Animation Engine Loop: Simulates multi-asset fractional micro-gains per second
  useEffect(() => {
    setLiveCombinedEarnings(accruedBalance);
    
    const initialIndiv: { [key: string]: number } = {};
    activeInvestments.forEach(inv => {
      initialIndiv[inv.id] = Number(inv.total_earned || 0);
    });
    setLiveIndividualEarnings(initialIndiv);

    const timer = setInterval(() => {
      let combinedDelta = 0;
      const updatedIndiv = { ...liveIndividualEarnings };

      activeInvestments.forEach(inv => {
        const principal = Number(inv.amount || 0);
        const dailyRate = Number(inv.daily_yield_rate || 0);
        const yieldPerSecond = (principal * dailyRate) / 86400;

        if (!updatedIndiv[inv.id]) updatedIndiv[inv.id] = Number(inv.total_earned || 0);
        updatedIndiv[inv.id] += yieldPerSecond;
        combinedDelta += yieldPerSecond;
      });

      setLiveIndividualEarnings(updatedIndiv);
      setLiveCombinedEarnings(prev => prev + combinedDelta);

      const updatedCountdowns: { [key: string]: string } = {};
      activeInvestments.forEach(inv => {
        const start = new Date(inv.created_at || inv.start_date || '').getTime();
        const durationMs = (inv.duration_days || 90) * 24 * 60 * 60 * 1000;
        const maturityTime = start + durationMs;
        const now = new Date().getTime();
        const diff = maturityTime - now;

        if (diff <= 0) {
          updatedCountdowns[inv.id] = 'Matured / Settled';
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          updatedCountdowns[inv.id] = `${days}d ${hours}h ${mins}m ${secs}s`;
        }
      });
      setCountdowns(updatedCountdowns);

    }, 1000);

    return () => clearInterval(timer);
  }, [investments, profile]);

  const handleReinvestActionClick = () => {
    if (isVelocityBreached) {
      toast.error('Action Restricted: Complete active verification milestones on your home dashboard to release contract deployment capabilities.');
      return;
    }
    setReinvestModalOpen(true);
  };

  const handleReinvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isVelocityBreached) {
      toast.error('Transaction blocked due to mandatory account upgrade status.');
      return;
    }

    const amountNum = Number(reinvestAmount);
    const targetPlan = plans.find(p => p.id === selectedPlanId);

    if (!targetPlan) {
      toast.error('Please select a strategic asset vector destination portfolio.');
      return;
    }

    if (!reinvestAmount || amountNum <= 0) {
      toast.error('Please enter a valid reinvestment amount tracking field.');
      return;
    }

    if (amountNum > accruedBalance) {
      toast.error('Insufficient available accrued dividend balance to execute routing.');
      return;
    }

    if (amountNum < targetPlan.min) {
      toast.error(`Minimum baseline allocation for ${targetPlan.name} is $${targetPlan.min.toLocaleString()}`);
      return;
    }

    try {
      setSubmittingReinvest(true);

      const { error: insertError } = await supabase.from('investments').insert([
        {
          user_id: profile.id,
          plan_name: targetPlan.name,
          asset_class: targetPlan.sector,
          amount: amountNum,
          daily_yield_rate: targetPlan.id === 'plan-crypto-alpha' ? 0.0038 : 0.0048,
          duration_days: 90,
          status: 'active'
        }
      ]);

      if (insertError) throw insertError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ earnings_balance: accruedBalance - amountNum })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      toast.success(`Successfully compounded $${amountNum.toLocaleString()} back into ${targetPlan.name}!`);
      setReinvestModalOpen(false);
      setReinvestAmount('');
      setSelectedPlanId('');
    } catch (err: any) {
      console.error('Compounding script error:', err);
      toast.error(err.message || 'Accounting pipeline engine dropped assignment.');
    } finally {
      setSubmittingReinvest(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Accrued Dividend Portals</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time settlement distributions computed down to the millisecond block</p>
        </div>
        <button
          onClick={handleReinvestActionClick}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-lg self-start sm:self-auto transition-all ${
            isVelocityBreached 
              ? 'bg-slate-800/40 border border-slate-700/50 text-slate-500 cursor-not-allowed' 
              : 'btn-primary'
          }`}
        >
          {isVelocityBreached ? <Lock size={13} className="text-rose-500" /> : <RefreshCw size={13} />}
          Reinvest Dividends
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${isVelocityBreached ? 'bg-rose-500' : 'bg-primary'}`} />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Combined Earnings Ledger</span>
          <button
            onClick={() => setHideBalances(!hideBalances)}
            className="btn-ghost p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            title={hideBalances ? 'Show Balances' : 'Hide Balances'}
          >
            {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-mono-nums text-4xl font-extrabold text-foreground tracking-tight">
            {hideBalances ? '••••••••' : `$${liveCombinedEarnings.toFixed(5)}`}
          </span>
          {!hideBalances && <span className={`text-xs font-semibold animate-pulse ${isVelocityBreached ? 'text-rose-400' : 'text-success'}`}>Live Ticking...</span>}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-5 w-full pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <span>{isExpanded ? 'Collapse granular multi-asset allocations' : 'Expand detailed allocation breakdowns'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div className="mt-4 pt-2 space-y-3 slide-down">
            {activeInvestments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No active investment allocations detected feeding into this layout tracker.</p>
            ) : (
              activeInvestments.map((inv) => {
                const meta = assetMeta[inv.asset_class || ''] || { color: '#71717a', icon: <Clock size={12} /> };
                const individualGain = liveIndividualEarnings[inv.id] || Number(inv.total_earned || 0);

                return (
                  <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{inv.plan_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono-nums">Principal: ${Number(inv.amount).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div className="text-[11px] text-muted-foreground font-medium">Maturity Countdown</div>
                        <div className="font-mono-nums text-xs font-bold text-foreground flex items-center gap-1">
                          <Clock size={11} className="text-primary animate-pulse" />
                          {countdowns[inv.id] || 'Estimating...'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] text-muted-foreground font-medium">Yield Collected</div>
                        <div className="font-mono-nums text-xs font-bold text-success">
                          {hideBalances ? '••••••' : `+$${individualGain.toFixed(5)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {reinvestModalOpen && !isVelocityBreached && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setReinvestModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>

            <form onSubmit={handleReinvestSubmit} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Compound Dividends</h3>
                <p className="text-xs text-muted-foreground">Route your live compiled returns directly back into open institutional pools.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Target Portfolio</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="input-field w-full px-3 py-2.5 text-xs bg-muted border border-border rounded-lg"
                  required
                >
                  <option value="">-- Choose Asset Distribution --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Min: ${p.min})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compounding Value (USD)</label>
                  <span className="text-[11px] font-bold text-primary font-mono-nums">Max Available: ${accruedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <input
                  type="number"
                  value={reinvestAmount}
                  onChange={(e) => setReinvestAmount(e.target.value)}
                  placeholder="Enter input values"
                  className="input-field w-full px-3 py-2.5 text-xs font-mono-nums bg-muted border border-border rounded-lg"
                  required
                  disabled={submittingReinvest}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReinvest}
                className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-lg"
              >
                {submittingReinvest ? 'Writing Ledger Nodes...' : 'Confirm Reinvestment Command'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}