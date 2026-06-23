'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  KeyRound, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Mail, 
  Activity, 
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';

interface Tier {
  id: string;
  level: string;
  name: string;
  limit: string;
  requirement: string;
  unlocked: boolean;
  details: string[];
}

export default function UserSettingsView() {
  const [activeTab, setActiveTab] = useState<'profile' | 'tiers' | 'security'>('profile');

  // Profile Management State
  const [profileName, setProfileName] = useState('Nwaigwe Okechukwu Augustine');
  const [profileEmail, setProfileEmail] = useState('investor@redman.finance');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Collapsible Details Mapping State
  const [expandedTier, setExpandedTier] = useState<string | null>('tier-1');

  // Card-Based Tier Management Layout 
  const [tiers, setTiers] = useState<Tier[]>([
    {
      id: 'tier-1',
      level: 'I',
      name: 'Bronze Clearance',
      limit: '$5,000 / daily',
      requirement: 'Identity Parsing Complete',
      unlocked: true,
      details: ['Standard ledger access channels', 'Basic automated email statements', 'Standard withdrawal validation window']
    },
    {
      id: 'tier-2',
      level: 'II',
      name: 'Silver Clearance',
      limit: '$25,000 / daily',
      requirement: 'Accumulate $1,000 Total Volume',
      unlocked: false,
      details: ['Priority server cluster synchronization', 'Advanced transaction reports', 'Accelerated clearing operations']
    },
    {
      id: 'tier-3',
      level: 'III',
      name: 'Gold Clearance',
      limit: '$100,000 / daily',
      requirement: 'Accumulate $10,000 Total Volume & Tier II Status',
      unlocked: false,
      details: ['Dedicated support node link', 'Uninhibited high-clearance liquidity avenues', 'Institutional asset protection frameworks']
    }
  ]);

  // Sequential Unlock Rule Logic Handler (Prevents rails skipping)
  const handleUnlockTier = (index: number) => {
    if (index === 0) return; // Tier 1 always unlocked
    
    const previousTier = tiers[index - 1];
    if (!previousTier.unlocked) {
      toast.error(`Access Denied: You must systematically unlock ${previousTier.name} before passing to this tier clearance level.`);
      return;
    }

    setTiers(prev => prev.map((t, i) => i === index ? { ...t, unlocked: true } : t));
    toast.success(`Success: Operational clearance upgraded to ${tiers[index].name}!`);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('System credentials modified and safely updated inside central records.');
  };

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Cryptographic signature must contain at least 6 alphanumeric variables.');
      return;
    }
    toast.success('Security password encryption key altered successfully.');
    setOldPassword('');
    setNewPassword('');
  };

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-4xl mx-auto select-none">
      
      {/* Node Diagnosic Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/20 border border-border rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <Activity size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Operational Status: Core Safe-Lock</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Session Cryptographic Node: Active 2026 TLS-V3</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-muted border border-border px-2 py-1 rounded text-muted-foreground w-fit">Last Synced: Just now</span>
      </div>

      {/* Navigation Router Tabs */}
      <div className="flex border-b border-border text-xs font-semibold gap-1">
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'profile' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Profile Identity
        </button>
        <button 
          onClick={() => setActiveTab('tiers')} 
          className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'tiers' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Volume Clearance Tiers
        </button>
        <button 
          onClick={() => setActiveTab('security')} 
          className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'security' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Security Keys
        </button>
      </div>

      {/* TAB CONTAINER CHANNELS */}
      <div className="mt-4 min-h-[300px]">
        
        {/* PANEL A: PROFILE INFORMATION */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><User size={14} className="text-primary" /> Modify Profile Data</h4>
              <p className="text-[11px] text-muted-foreground">Adjust display markers and central reporting address pipelines.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Full Legal Name</label>
                <input 
                  type="text" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">System Communication Email</label>
                <div className="relative">
                  <Mail size={12} className="absolute left-3 top-3 text-muted-foreground/60" />
                  <input 
                    type="email" 
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-all shadow-sm">
              Save Identity Settings
            </button>
          </form>
        )}

        {/* PANEL B: CARD-BASED COLLAPSIBLE TIER CLEARANCES */}
        {activeTab === 'tiers' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-500 text-[11px] flex gap-2 items-start">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed"><strong>System Rule Restriction:</strong> Access clearance structures are sequential. Lower boundaries must hold a verified status before superior ledger limits can unlock.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {tiers.map((tier, idx) => {
                const isOpen = expandedTier === tier.id;
                return (
                  <div key={tier.id} className={`bg-card border rounded-xl overflow-hidden transition-all ${tier.unlocked ? 'border-border' : 'border-border/40 opacity-75'}`}>
                    
                    {/* Tier Card Interactive Summary Wrapper Row */}
                    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${tier.unlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {tier.level}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-foreground">{tier.name}</h4>
                            {tier.unlocked ? (
                              <span className="text-[9px] font-bold bg-success/10 text-success px-1.5 py-0.2 rounded flex items-center gap-1">✓ Active</span>
                            ) : (
                              <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.2 rounded flex items-center gap-1"><Lock size={8} /> Closed</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Withdrawal Boundary: <span className="font-mono text-foreground font-semibold">{tier.limit}</span></p>
                        </div>
                      </div>

                      {/* Dropdown Action Array */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {!tier.unlocked && (
                          <button 
                            type="button"
                            onClick={() => handleUnlockTier(idx)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-white hover:opacity-90 flex items-center gap-1.5"
                          >
                            <Unlock size={10} /> Upgrade Tier
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => setExpandedTier(isOpen ? null : tier.id)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        >
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Box Specifications Layer Area */}
                    {isOpen && (
                      <div className="p-4 border-t border-border/60 bg-background/10 space-y-2.5 animate-in slide-in-from-top-1 duration-200">
                        <div className="text-[11px]">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider block mb-1">Unlock Target Constraint</span>
                          <p className="text-foreground font-medium">{tier.requirement}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[10px]">Permission Parameters Enabled</span>
                          <ul className="space-y-1">
                            {tier.details.map((detail, dIdx) => (
                              <li key={dIdx} className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <CheckCircle2 size={12} className="text-primary/70 shrink-0" /> {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PANEL C: ENCRYPTION KEYS AND SECURITY PASSWORD */}
        {activeTab === 'security' && (
          <form onSubmit={handleUpdateSecurity} className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5"><KeyRound size={14} className="text-primary" /> Modify Security Phrases</h4>
              <p className="text-[11px] text-muted-foreground">Rotate your platform access cryptographic passwords systematically.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Password Signature</label>
                <input 
                  type="password" 
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full max-w-sm bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Target Next Password Phrase</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full max-w-sm bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-all shadow-sm">
              Rotate Encryption Signature
            </button>
          </form>
        )}
      </div>
    </div>
  );
}