import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  Unlock,
  ShieldAlert, 
  CheckCircle2,
  Calendar,
  Clock,
  PhoneCall,
  Coins,
  Gem,
  Flame,
  Building2,
  AlertTriangle,
  X,
  BadgeCheck,
  FileCheck
} from 'lucide-react';
import { Profile, Investment, Transaction } from '@/hooks/useRealtime';

interface UserHomeViewProps {
  profile: Profile;
  investments: Investment[];
  transactions: Transaction[];
  setActiveTab: (tab: string) => void;
}

export const UserHomeView: React.FC<UserHomeViewProps> = ({
  profile,
  investments,
  transactions,
  setActiveTab
}) => {
  // --- UI States ---
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // --- FIXED: Included bonus_balance in the structural calculation base ---
  const [livePortfolioValue, setLivePortfolioValue] = useState<number>(
    Number(profile.main_balance || 0) + 
    Number(profile.earnings_balance || 0) + 
    Number(profile.bonus_balance || 0)
  );
  
  const [runtimeRequiredVolume, setRuntimeRequiredVolume] = useState<number>(
    profile.required_volume || (Number(profile.main_balance || 0) * 0.03)
  );

  // Sync state cleanly if the database profile payload updates via realtime streams
  useEffect(() => {
    setLivePortfolioValue(
      Number(profile.main_balance || 0) + 
      Number(profile.earnings_balance || 0) + 
      Number(profile.bonus_balance || 0)
    );
    setRuntimeRequiredVolume(profile.required_volume || (Number(profile.main_balance || 0) * 0.03));
  }, [profile]);

  // Live Digital Clock Heartbeat
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Live Micro-Yield Ticking & Runtime Grace Penalty Interpreter ---
  useEffect(() => {
    const dailyAccrualTotal = investments
      .filter(inv => inv.status === 'active' && inv.daily_yield_rate)
      .reduce((acc, inv) => acc + (Number(inv.amount) * Number(inv.daily_yield_rate)), 0);

    let dynamicPenaltyPerSecond = 0;
    if (profile.timeline_anchor_date) {
      const anchorDate = new Date(profile.timeline_anchor_date);
      if (currentTime.getTime() > anchorDate.getTime()) {
        const dailyRate = Number(profile.grace_index_rate || 0.0002);
        const totalCapitalStaked = Number(profile.main_balance || 0) + Number(profile.earnings_balance || 0);
        const dailyPenaltyAccumulation = totalCapitalStaked * dailyRate;
        dynamicPenaltyPerSecond = dailyPenaltyAccumulation / 86400;
      }
    }

    const secondsTicker = setInterval(() => {
      if (dailyAccrualTotal > 0) {
        setLivePortfolioValue(prev => prev + (dailyAccrualTotal / 86400));
      }
      if (dynamicPenaltyPerSecond > 0) {
        setRuntimeRequiredVolume(prev => prev + dynamicPenaltyPerSecond);
      }
    }, 1000);

    return () => clearInterval(secondsTicker);
  }, [investments, profile, currentTime]);

  // --- Balance Locking Threshold Metrics ---
  const accountAgeMonths = () => {
    const created = new Date(profile.created_at || '');
    const now = new Date();
    return (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  };

  const isVelocityBreached = profile.upgrade_required || (Number(profile.main_balance || 0) > 500000 && accountAgeMonths() < 5);
  const progressPercent = profile.kyc_progress_percent || 0;

  // --- Dynamic Color Matrix Evaluator ---
  const getPadlockColorClasses = () => {
    if (progressPercent >= 100 && !isVelocityBreached) {
      return {
        border: 'border-emerald-500/40 from-emerald-950/40 via-slate-900 to-slate-950',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        fill: 'bg-emerald-500'
      };
    }
    if (progressPercent >= 40) {
      return {
        border: 'border-blue-500/40 from-blue-950/40 via-slate-900 to-slate-950',
        text: 'text-blue-400',
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        fill: 'bg-blue-500'
      };
    }
    return {
      border: 'border-rose-500/40 from-rose-950/30 via-slate-900 to-slate-950',
      text: 'text-rose-400',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      fill: 'bg-rose-500'
    };
  };

  const UIStyles = getPadlockColorClasses();

  const formatVelocityTimestamp = (isoString: string) => {
    const txTime = new Date(isoString);
    const diffMs = currentTime.getTime() - txTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just Now';
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return `${diffMin} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getAssetIcon = (assetClass: string | null) => {
    switch (assetClass?.toLowerCase()) {
      case 'crypto': return <Coins className="text-amber-400 w-4 h-4" />;
      case 'precious_metals': return <Gem className="text-cyan-400 w-4 h-4" />;
      case 'commodities': return <Flame className="text-orange-400 w-4 h-4" />;
      default: return <Building2 className="text-indigo-400 w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Welcome Back, <span className="text-indigo-400">{profile.full_name || 'Investor Ledger'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Secure Institutional Custody Context Account Tier: <span className="text-slate-200 font-mono">{profile.grade || 'Standard T1'}</span></p>
        </div>
        <button 
          onClick={() => setIsPrivate(!isPrivate)}
          className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 transition-all px-4 py-2 rounded-xl border border-slate-700"
        >
          {isPrivate ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {isPrivate ? 'Reveal Records' : 'Mask Records'}
        </button>
      </div>

      {/* CORE BALANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-500/20 shadow-xl overflow-hidden group">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Total Account Value Payload</p>
          <p className="text-3xl font-mono font-bold mt-3 text-white">
            {isPrivate ? '••••••••••' : `$${livePortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg w-fit">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Real-time Compound Processing Active
          </div>
        </div>

        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settled Wallet Capital</p>
          <p className="text-3xl font-mono font-bold mt-3 text-white">
            {isPrivate ? '••••••••••' : `$${Number(profile.main_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-slate-500 text-[11px] mt-4 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Authorized Internal Settlement Core
          </p>
        </div>

        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Accrued Yield Accumulation</p>
          <p className="text-3xl font-mono font-bold mt-3 text-white">
            {isPrivate ? '••••••••••' : `$${Number(profile.earnings_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-indigo-400 text-[11px] mt-4">Compounding automatically inside active node contracts</p>
        </div>
      </div>

      {/* RE-ENGINEERED COMPLIANCE PADLOCK INTERACTION HUB */}
      <div className={`bg-gradient-to-r ${UIStyles.border} border-2 rounded-2xl p-6 shadow-2xl transition-all duration-300`}>
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left w-full lg:max-w-4xl">
            
            {/* INTERACTIVE SMART PADLOCK DOCK */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-5 rounded-2xl border border-slate-700 bg-slate-950/80 shadow-inner group relative flex items-center justify-center shrink-0 hover:scale-105 transition-all"
            >
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col items-center justify-center w-16 h-16">
                {isVelocityBreached ? (
                  <Lock className={`w-8 h-8 ${UIStyles.text} animate-pulse`} />
                ) : (
                  <Unlock className="w-8 h-8 text-emerald-400" />
                )}
                <span className="text-[11px] font-mono font-black tracking-tighter mt-1 text-slate-300">
                  {progressPercent}%
                </span>
              </div>
            </button>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Institutional Capital Authorization Framework
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border uppercase ${UIStyles.badge}`}>
                  {isVelocityBreached ? `Phase Verification Active` : `Clearance Passed`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Your settlement balance has arrived securely. Because this transfer payload intersects with cross-border liquidity ratio bounds or early registration metrics, compliance structures require verified indexing tasks before outbound liquidity or re-investment functions are fully unlocked.
              </p>
              
              {isVelocityBreached && (
                <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2.5 rounded-xl mt-3 text-[11px] font-medium text-slate-300 flex items-center gap-2">
                  <span className="text-indigo-400 font-mono font-bold">Index Volume:</span> 
                  <span className="text-white font-mono font-bold">${runtimeRequiredVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-slate-500">| Split cleanly across 3 chronological automated pipeline horizons.</span>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC PRIMARY CTAS CONTROL LOCK */}
          <div className="flex flex-row sm:flex-col gap-3.5 w-full lg:w-auto shrink-0 justify-center">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 lg:w-52 text-center bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" /> Check Mandatory Tasks
            </button>
            <button 
              onClick={() => setActiveTab('wallet')}
              className="flex-1 lg:w-52 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Fulfill Settlement
            </button>
          </div>
        </div>

        {/* BACKGROUND TIMELINE GRACE DETECTOR WARNING */}
        {profile.timeline_anchor_date && isVelocityBreached && new Date(profile.timeline_anchor_date).getTime() < currentTime.getTime() && (
          <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-center gap-2 text-[11px] text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
            <span>
              <strong>Compliance Anchor Period Terminus Exceeded:</strong> Institutional alignment protocols are auto-investing capital frameworks in the background. Liquidity index demands are scaling concurrently at a graceful <span className="font-mono text-white">{((profile.grace_index_rate || 0.0002) * 100).toFixed(4)}%/day</span> margin.
            </span>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS ROUTING HIERARCHY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Deposit Liquidity Channel', tab: 'wallet', desc: 'Acquire immediate digital asset address logs', enforceLock: false },
          { label: 'Premium Contract Placements', tab: 'invest', desc: 'Deploy funds into institutional asset structures', enforceLock: true },
          { label: 'Audit Earnings Ledger', tab: 'earnings', desc: 'Examine automated compounding data blocks', enforceLock: false },
          { label: 'Withdrawal Clearance Gate', tab: 'wallet', desc: 'Liquidate available funds out of system core', enforceLock: true }
        ].map((btn, i) => {
          const isButtonLocked = isVelocityBreached && btn.enforceLock;
          return (
            <button
              key={i}
              onClick={() => {
                if (isButtonLocked) {
                  setIsModalOpen(true);
                } else {
                  setActiveTab(btn.tab);
                }
              }}
              className={`p-4 rounded-xl text-left transition-all relative overflow-hidden border ${
                isButtonLocked 
                  ? 'bg-slate-950/40 border-slate-900 text-slate-500 group cursor-pointer hover:border-rose-500/30' 
                  : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className={`text-xs font-bold transition-colors ${isButtonLocked ? 'text-slate-500 group-hover:text-rose-400' : 'text-white group-hover:text-indigo-400'}`}>
                  {btn.label}
                </span>
                {isButtonLocked ? (
                  <Lock className="w-3.5 h-3.5 text-rose-500/70" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-tight">{btn.desc}</p>
            </button>
          );
        })}
      </div>

      {/* SIBLINGS FOOTER (INVESTMENTS & TABLES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Active System Allocations
            </h3>
            {investments.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs font-mono">No nodes active.</div>
            ) : (
              <div className="space-y-3">
                {investments.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 shrink-0">
                        {getAssetIcon(inv.asset_class ?? null)}
                      </div>
                      <div className="truncate max-w-[120px]">
                        <p className="text-xs font-bold text-slate-200 capitalize truncate">{inv.asset_class?.replace('_', ' ')}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">End: {new Date(inv.maturity_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-bold text-white">${Number(inv.amount).toLocaleString()}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">+{((inv.daily_yield_rate || 0) * 100).toFixed(2)}%/d</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => !isVelocityBreached && setActiveTab('invest')}
            className={`w-full text-center text-xs font-semibold py-2.5 rounded-xl border mt-4 transition-colors ${isVelocityBreached ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'}`}
            disabled={isVelocityBreached}
          >
            Explore Alternative High-Yield Tiers
          </button>
        </div>

        <div className="lg:col-span-2 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" /> Audited Capital Clearing Ledger
          </h3>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-xs font-mono">No transaction metadata found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="pb-3">Vector</th>
                    <th className="pb-3">Payload</th>
                    <th className="pb-3">Clearance Status</th>
                    <th className="pb-3 text-right">Settlement Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs font-mono">
                  {transactions.slice(0, 5).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 pr-2 font-sans font-medium text-slate-200 flex items-center gap-2">
                        {tx.type === 'deposit' || tx.type === 'yield' ? (
                          <div className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                            <ArrowDownLeft className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="p-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
                            <ArrowUpRight className="w-3 h-3" />
                          </div>
                        )}
                        <span className="capitalize">{tx.type}</span>
                      </td>
                      <td className="py-3.5 font-bold text-white">
                        ${Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          tx.status === 'completed' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' :
                          tx.status === 'pending' ? 'bg-amber-500/5 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/5 text-rose-400 border-rose-500/20'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-slate-400 font-sans text-xs">
                        {formatVelocityTimestamp(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY INTERACTIVE SYSTEM BREAKDOWN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl">
            
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${UIStyles.badge}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Institutional Clearing Tasks Checklist</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">Verification Matrix Progress: {progressPercent}%</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed mb-1">
                To unlock automated outbound actions, the following internal compliance targets must be satisfied and evaluated by administrative desks:
              </p>

              {/* TASK 1 */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BadgeCheck className={`w-5 h-5 shrink-0 ${profile.id_verification_state === 'completed' ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-200">KYC Legal Identification Node</p>
                    <p className="text-[10px] text-slate-500">Government ID clearance document check</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize ${
                  profile.id_verification_state === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>{profile.id_verification_state}</span>
              </div>

              {/* TASK 2 */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BadgeCheck className={`w-5 h-5 shrink-0 ${profile.milestone_alpha_state === 'completed' ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Allocation Milestone Alpha Clearance</p>
                    <p className="text-[10px] text-slate-500">First chronological index payload verification</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize ${
                  profile.milestone_alpha_state === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>{profile.milestone_alpha_state}</span>
              </div>

              {/* TASK 3 */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BadgeCheck className={`w-5 h-5 shrink-0 ${profile.milestone_beta_state === 'completed' ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Allocation Milestone Beta Clearance</p>
                    <p className="text-[10px] text-slate-500">Second chronological index payload verification</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize ${
                  profile.milestone_beta_state === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>{profile.milestone_beta_state}</span>
              </div>

              {/* TASK 4 */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BadgeCheck className={`w-5 h-5 shrink-0 ${profile.milestone_gamma_state === 'completed' ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Allocation Milestone Gamma Clearance</p>
                    <p className="text-[10px] text-slate-500">Final sequence verification audit validation</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize ${
                  profile.milestone_gamma_state === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>{profile.milestone_gamma_state}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" /> Automated monitoring status.
              </span>
              <button 
                onClick={() => { setIsModalOpen(false); setActiveTab('profile'); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
              >
                Go to Identity Center
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};