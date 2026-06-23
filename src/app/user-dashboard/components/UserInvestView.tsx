'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calculator, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Coins, 
  Building2, 
  Fuel, 
  Award, 
  Compass, 
  Landmark,
  Eye,
  EyeOff,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Profile, Investment } from '@/hooks/useRealtime';

interface UserInvestViewProps {
  profile: Profile;
  investments: Investment[];
}

interface InvestmentPlan {
  id: string;
  name: string;
  sector: string;
  type: string;
  dailyRate: number; // Percentage value (e.g., 0.38 means 0.38%)
  duration: number;
  minInvestment: number;
  maxInvestment: number;
  totalReturn: number;
  features: string[];
  story: string;
  popular: boolean;
  locked: boolean;
  color: string;
  icon: React.ReactNode;
}

export default function UserInvestView({ profile, investments }: UserInvestViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [calcAmount, setCalcAmount] = useState('5000');
  const [submitting, setSubmitting] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);

  // 6 Premium Global Asset Portfolios
  const plans: InvestmentPlan[] = [
    {
      id: 'plan-crypto-alpha',
      name: 'Crypto Liquidity Matrix',
      sector: 'Digital Assets',
      type: 'Algorithmic Yield',
      dailyRate: 0.38,
      duration: 90,
      minInvestment: 500,
      maxInvestment: 10000,
      totalReturn: 34.2,
      features: ['High-frequency arbitrage execution', 'Full automated compounding analytics', 'Tier 1 Clearance Entry'],
      story: 'Capitalizes on market inefficiencies across major decentralized exchange liquidity layers using optimized institutional high-frequency order routers.',
      popular: false, locked: false, color: '#3B82F6',
      icon: <Coins size={18} />
    },
    {
      id: 'plan-crude-oil',
      name: 'Brent Crude Oil Futures',
      sector: 'Global Commodities',
      type: 'Macro Futures Contracts',
      dailyRate: 0.48,
      duration: 120,
      minInvestment: 3000,
      maxInvestment: 50000,
      totalReturn: 57.6,
      features: ['Hedged price stability metrics', 'Guaranteed monthly delivery options', 'Institutional compliance verification'],
      story: 'Direct fractional allocation anchored to multi-million dollar physical maritime shipping cargo lot manifests and premium crude oil exploration contracts.',
      popular: true, locked: false, color: '#E8500A',
      icon: <Fuel size={18} />
    },
    {
      id: 'plan-real-estate',
      name: 'Metropolitan Commercial Equity',
      sector: 'Premium Real Estate',
      type: 'Fractional Asset Stacking',
      dailyRate: 0.28,
      duration: 180,
      minInvestment: 1500,
      maxInvestment: 30000,
      totalReturn: 50.4,
      features: ['Class-A skyscraper lease underwriting', 'Quarterly asset revaluations', 'Full inflation offset hedge'],
      story: 'Provides consistent rental yield tracking and capital appreciation pools sourced directly from high-end corporate office complexes across top financial centers.',
      popular: false, locked: false, color: '#22C55E',
      icon: <Building2 size={18} />
    },
    {
      id: 'plan-gold-bullion',
      name: 'Sovereign Bullion Reserve',
      sector: 'Precious Metals',
      type: 'Physical Custody Tracking',
      dailyRate: 0.22,
      duration: 365,
      minInvestment: 5000,
      maxInvestment: 100000,
      totalReturn: 80.3,
      features: ['Physical gold vault audit reports', 'Direct bullion redemption options', 'Maximum capital safety threshold'],
      story: 'The ultimate safe-haven wealth shield. Backed 1:1 by physical, allocated gold bullion held deep within secured underground vault reserves.',
      popular: false, locked: false, color: '#F59E0B',
      icon: <Landmark size={18} />
    },
    {
      id: 'plan-tech-arbitrage',
      name: 'AI Cluster Computational Farms',
      sector: 'High Technology',
      type: 'Infrastructure Financing',
      dailyRate: 0.55,
      duration: 60,
      minInvestment: 10000,
      maxInvestment: 250000,
      totalReturn: 33.0,
      features: ['GPU cluster hardware collateralization', 'SLA guaranteed performance returns', 'Short-term high velocity cycles'],
      story: 'Directly finances hardware scaling matrices leased by global enterprise machine learning projects. Yields are generated from real-time compute renting workflows.',
      popular: false, locked: false, color: '#A855F7',
      icon: <Award size={18} />
    },
    {
      id: 'plan-maritime-cargo',
      name: 'Elite Maritime Shipping Logistics',
      sector: 'Global Trade Supply Chains',
      type: 'Cargo Charter Pools',
      dailyRate: 0.65,
      duration: 150,
      minInvestment: 25000,
      maxInvestment: 1000000,
      totalReturn: 97.5,
      features: ['Grade IV+ clearance credentials required', 'Dedicated ocean freight tracking', 'Priority liquidations'],
      story: 'Exclusive premium tier operations capturing massive shipping layout dividends via deep-water dry bulk carrier operations and cargo charters.',
      popular: false, locked: true, color: '#06B6D4',
      icon: <Compass size={18} />
    }
  ];

  const currentPlan = plans.find((p) => p.id === selectedPlanId);
  
  const settledBalance = Number(profile?.main_balance || 0);

  const activeCapitalAllocated = investments
    .filter(inv => inv.status === 'active')
    .reduce((acc, current) => acc + Number(current.amount), 0);

  const calcResult = currentPlan && parseFloat(calcAmount) >= currentPlan.minInvestment
    ? {
        daily: parseFloat(calcAmount) * (currentPlan.dailyRate / 100),
        total: parseFloat(calcAmount) * (1 + currentPlan.totalReturn / 100),
        profit: parseFloat(calcAmount) * (currentPlan.totalReturn / 100),
      }
    : null;

  const executeInvestment = async (plan: InvestmentPlan) => {
    const inputAmount = Number(calcAmount);

    if (isNaN(inputAmount) || inputAmount < plan.minInvestment) {
      toast.error(`Minimum requirement for this asset tier is $${plan.minInvestment.toLocaleString()}`);
      return;
    }

    if (inputAmount > plan.maxInvestment) {
      toast.error(`Maximum threshold bound for this plan tier is $${plan.maxInvestment.toLocaleString()}`);
      return;
    }

    if (settledBalance < inputAmount) {
      const deficiency = inputAmount - settledBalance;
      toast.error(
        `Insufficient ledger funding. You require an additional $${deficiency.toLocaleString(undefined, { minimumFractionDigits: 2 })} inside your Central Treasury balance to deploy this allocation profile.`,
        { duration: 7000 }
      );
      return;
    }

    try {
      setSubmitting(true);

      // 🕒 Dynamic calculation of contract parameters
      const maturityDate = new Date();
      maturityDate.setDate(maturityDate.getDate() + plan.duration);

      // Step 1: Insert dynamic contract entry into PostgreSQL with relational tracking parameters
      const { error: insertError } = await supabase.from('investments').insert([
        {
          user_id: profile.id,
          plan_id: plan.id, // Relational assignment targeting master asset table
          asset_class: plan.sector,
          amount: inputAmount,
          daily_yield_rate: plan.dailyRate / 100,
          duration_days: plan.duration,
          maturity_date: maturityDate.toISOString(), // Precision timestamp mapping configuration
          status: 'active',
        }
      ]);

      if (insertError) throw insertError;

      // Step 2: Update central 'main_balance' field
      const updatedBalance = settledBalance - inputAmount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ main_balance: updatedBalance })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      toast.success(`Success! $${inputAmount.toLocaleString()} has been safely collateralized inside the ${plan.name} asset matrix.`);
      setSelectedPlanId(null);
    } catch (err: any) {
      console.error('Brokerage engine failed allocation sequence:', err);
      toast.error(err.message || 'Asset processing framework experienced an allocation exception.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 fade-in text-slate-100">
      {/* Dynamic Upper Topbar Meta Statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-850/60 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Global Multi-Asset Portfolios 
            <span className="text-[10px] uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono font-normal">
              Tier 1 Nodes
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            Deploy settled capital instantly across premium enterprise matrices.
          </p>
        </div>

        <div className="flex items-center gap-6 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Active Capital Pools</span>
            <span className="font-mono text-sm font-bold text-slate-300">
              {hideBalances ? '••••••' : `$${activeCapitalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </span>
          </div>
          <div className="text-right border-l border-slate-800 pl-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Available Vault Balance</span>
            <span className="font-mono text-base font-black text-primary block">
              {hideBalances ? '••••••' : `$${settledBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </span>
          </div>
          <button
            onClick={() => setHideBalances(!hideBalances)}
            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={hideBalances ? "Reveal Accounts Balance" : "Obscure Private Figures"}
          >
            {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Plans Card Mesh Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isSelected = selectedPlanId === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border bg-slate-950/40 p-5 relative hover:scale-[1.01] cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected ? 'border-primary bg-slate-950/90' : 'border-slate-900 bg-slate-950/30'
              } ${p.locked ? 'opacity-40 cursor-not-allowed select-none' : ''}`}
              style={{
                boxShadow: isSelected ? `0 0 20px rgba(232, 80, 10, 0.08)` : undefined,
              }}
              onClick={() => !p.locked && !submitting && setSelectedPlanId(isSelected ? null : p.id)}
            >
              <div>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider bg-gradient-to-r from-primary to-orange-600 shadow-md border border-primary/20">
                    High Volume Allocation
                  </div>
                )}
                {p.locked && (
                  <div className="absolute top-4 right-4 text-slate-600" title="Clearance Restricted">
                    <Lock size={14} />
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-150 border"
                    style={{ backgroundColor: `${p.color}08`, color: p.color, borderColor: `${p.color}20` }}
                  >
                    {p.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100 tracking-tight">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{p.sector} • <span className="text-slate-500">{p.type}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2.5 px-1 rounded-lg bg-slate-900/30 text-center mb-4 border border-slate-900/60">
                  <div>
                    <div className="font-mono text-sm font-bold" style={{ color: p.color }}>{p.dailyRate}%</div>
                    <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Daily ROI</div>
                  </div>
                  <div className="border-x border-slate-900">
                    <div className="font-mono text-sm font-bold text-slate-200">{p.duration}d</div>
                    <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Term Lock</div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-emerald-400">+{p.totalReturn}%</div>
                    <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Total Yield</div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[48px] line-clamp-3">
                  {p.story}
                </p>

                <div className="space-y-2 mb-5">
                  {p.features.map((feat, index) => (
                    <div key={`${p.id}-feat-${index}`} className="flex items-center gap-2">
                      <CheckCircle2 size={12} style={{ color: p.color }} className="shrink-0 opacity-80" />
                      <span className="text-xs text-slate-300 truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900 pt-3.5 mb-1">
                  <span>Min Entry: <span className="font-mono text-slate-300 font-semibold">${p.minInvestment.toLocaleString()}</span></span>
                  <span>Cap: <span className="font-mono text-slate-300 font-semibold">${p.maxInvestment.toLocaleString()}</span></span>
                </div>

                {p.locked && (
                  <div className="mt-2.5 p-1.5 rounded-lg text-[10px] font-bold text-center bg-amber-500/5 text-amber-500 border border-amber-500/10 uppercase tracking-wide">
                    Requires Account Grade Clearance IV+
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calculator & Asset Settlement Processing Box */}
      {selectedPlanId && currentPlan && (
        <div className="rounded-xl border border-primary bg-slate-950 p-6 slide-up space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={() => setSelectedPlanId(null)}
              className="text-xs text-slate-500 hover:text-slate-300 font-medium bg-slate-900 border border-slate-800 px-2 py-1 rounded-md transition-colors"
            >
              Cancel Session
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Allocation Parameters & Forecast Ledger — {currentPlan.name}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Amount to Allocate (USD)
                </label>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  min={currentPlan.minInvestment}
                  max={currentPlan.maxInvestment}
                  disabled={submitting}
                  className="w-full px-4 py-3 text-sm font-mono bg-slate-900 text-white border border-slate-800 rounded-lg focus:outline-none focus:border-primary/80 transition-colors"
                  placeholder={`Min Entry limit $${currentPlan.minInvestment.toLocaleString()}`}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                <span>Scope Bounds: ${currentPlan.minInvestment.toLocaleString()} – ${currentPlan.maxInvestment.toLocaleString()}</span>
                <span className="font-semibold text-primary">
                  Available Vault: {hideBalances ? '••••••' : `$${settledBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>

            {calcResult ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Daily Accrual', value: `$${calcResult.daily.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                  { label: 'Contract Profit', value: `$${calcResult.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                  { label: 'Total Settle Value', value: `$${calcResult.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                ].map((r, index) => (
                  <div
                    key={`calc-res-${index}`}
                    className="text-center p-3 rounded-xl bg-slate-900/40 border border-slate-800/60"
                  >
                    <div className="font-mono text-xs font-bold text-primary truncate">{r.value}</div>
                    <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-1 leading-tight">{r.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-900 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <TrendingDown size={14} />
                Value parameters do not satisfy minimum asset entry allocations.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-2 text-xs text-slate-400 max-w-xl leading-relaxed">
              <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
              <span>By processing this deployment, funds will be internally moved from your settled wallet into an active yield ledger. Fixed terms remain constrained until maturity parameters clear.</span>
            </div>
            
            <button
              onClick={() => executeInvestment(currentPlan)}
              disabled={submitting || !calcResult}
              className="px-6 py-3 bg-primary hover:bg-orange-600 text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors shrink-0 w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/10"
            >
              {submitting ? 'Confirming Asset Clearance...' : `Deploy Capital Into ${currentPlan.name}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}