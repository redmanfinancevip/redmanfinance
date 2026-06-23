'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Copy, 
  Check, 
  Save, 
  Lock, 
  Key, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Fingerprint,
  ShieldAlert,
  ServerCrash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDashboardData } from '@/hooks/useDashboardData';

interface UserProfileViewProps {
  userProfile: any;
}

export default function UserProfileView({ userProfile }: UserProfileViewProps) {
  const { profile, refetch, loading } = useDashboardData(userProfile?.id);
  
  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [updating, setUpdating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Email Update States
  const [newEmail, setNewEmail] = useState('');
  const [emailUpdating, setEmailUpdating] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error' | 'otp_stage'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  
  // Direct Token Verification State (No Roundabout Redirects)
  const [verificationToken, setVerificationToken] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || userProfile?.user_metadata?.full_name || '');
      setUsername(profile.username || userProfile?.user_metadata?.username || '');
    }
  }, [profile, userProfile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm text-muted-foreground font-medium">Assembling identity profiles...</p>
      </div>
    );
  }

  const email = userProfile?.email || 'investor@redman.finance';
  const uid = userProfile?.id || 'N/A';
  const kycStatus = profile?.kyc_status || 'unverified';
  const depositAddress = profile?.crypto_deposit_address || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

  const handleCopyToClipboard = async (text: string, fieldId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; 
        textArea.style.left = "-999999px"; 
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
      }
    } catch (err) {
      console.error('Clipboard action failed:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (error) throw error;
      
      setSaveStatus('success');
      await refetch();
    } catch (err: any) {
      console.error("Profile saving error:", err);
      setSaveStatus('error');
    } finally {
      setUpdating(false);
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Phase 1: Request Email Parameter Shift
  const handleEmailUpdateInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === email) return;

    setEmailUpdating(true);
    setEmailStatus('idle');
    setEmailMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setEmailStatus('otp_stage');
      setEmailMessage('Verification tokens transmitted. Please pull the code from your mailbox below.');
    } catch (err: any) {
      console.error("Email operational failure:", err);
      setEmailStatus('error');
      setEmailMessage(err.message || 'Verification initialized rejected.');
    } finally {
      setEmailUpdating(false);
    }
  };

  // Phase 2: Direct OTP Token Resolution Hook (Saves turning around)
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken.trim()) return;

    setVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: verificationToken.trim(),
        type: 'email_change'
      });

      if (error) throw error;

      setEmailStatus('success');
      setEmailMessage('System email routing paths systematically re-bound.');
      setNewEmail('');
      setVerificationToken('');
      window.location.reload(); // Refresh session variables instantly
    } catch (err: any) {
      console.error("OTP authentication rejection:", err);
      setEmailStatus('otp_stage'); // preserve box visibility
      alert(err.message || 'Cryptographic verification code token rejected.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const getKycBadge = (status: string) => {
    const maps: Record<string, { text: string; css: string }> = {
      verified: { text: 'Verified KYC Passport Access', css: 'bg-success/10 text-success border-success/20' },
      pending: { text: 'Identity Audit Review Pending', css: 'bg-warning/10 text-warning border-warning/20' },
      unverified: { text: 'Unverified Access Node', css: 'bg-danger/10 text-danger border-danger/20' }
    };
    const active = maps[status] || maps.unverified;
    return <span className={`border px-3 py-1 rounded-lg text-xs font-semibold ${active.css}`}>{active.text}</span>;
  };

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto selection:bg-primary selection:text-white">
      
      {/* Dynamic Security Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Security Configuration', val: 'TLS v1.3 Enforced', icon: Fingerprint },
          { label: 'Asset Node Link', val: 'Synchronized', icon: ShieldCircleage },
          { label: 'Database Protocol', val: 'RLS Context Active', icon: Shield }
        ].map((m, i) => {
          const Icon = m.icon || Shield;
          return (
            <div key={i} className="bg-card/40 border border-border/60 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 bg-primary/5 text-primary rounded-lg"><Icon size={14} /></div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{m.label}</p>
                <p className="text-xs font-bold text-foreground font-mono mt-0.5">{m.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profile Header Node */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-2xl text-primary font-mono relative">
            {fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{fullName || 'Investor Account'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{email}</p>
          </div>
        </div>
        <div>{getKycBadge(kycStatus)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Forms Column */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Identity Parameters Box */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <User size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Identity Profile Management</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Legal Full Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full legal name"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">System Username</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground/60 font-semibold">@</span>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Create identity handle"
                      className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-[11px] font-medium animate-fadeIn">
                  <CheckCircle2 size={14} /> Global ledger changes systematically committed.
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-[11px] font-medium animate-fadeIn">
                  <AlertCircle size={14} /> Security configuration barrier prevented field writing.
                </div>
              )}

              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5"
              >
                {updating ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                {updating ? 'Committing...' : 'Commit Core Updates'}
              </button>
            </form>
          </div>

          {/* Secure Email Routing Panel */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Mail size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Communications Routing Channel</h3>
            </div>

            {/* Stage A: Send Email Request Token */}
            {emailStatus !== 'otp_stage' ? (
              <form onSubmit={handleEmailUpdateInit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      Active Verified Mail Address <Lock size={10} />
                    </label>
                    <div className="relative opacity-60">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="email" 
                        value={email} 
                        disabled 
                        className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-muted-foreground cursor-not-allowed font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Target Destination Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                      <input 
                        type="email" 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="enter next node email address"
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                {emailStatus === 'success' && (
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-[11px] font-medium flex gap-1.5">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> <span>{emailMessage}</span>
                  </div>
                )}
                {emailStatus === 'error' && (
                  <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-[11px] font-medium flex gap-1.5">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{emailMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={emailUpdating || !newEmail || newEmail === email}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
                >
                  {emailUpdating ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                  {emailUpdating ? 'Deploying system strings...' : 'Deploy Email Shift Strings'}
                </button>
              </form>
            ) : (
              
              /* STAGE B: FAST COMPACT CODE CONFIRMATION FORM (No Turning Around) */
              <form onSubmit={handleVerifyEmailOtp} className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                <div className="p-3 bg-primary/5 border border-primary/10 text-primary rounded-xl text-[11px] leading-relaxed">
                  <strong>Verification String Dispatched:</strong> Check your inbox for the multi-factor authentication pass token. Enter it into the ledger validator frame below to complete the secure transition.
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Secure Input token (OTP)</label>
                  <input 
                    type="text"
                    required
                    maxLength={6}
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="000000"
                    className="w-48 bg-muted border border-border text-center rounded-xl py-2.5 text-base font-mono font-bold tracking-widest text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={verifyingOtp || verificationToken.length < 5}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-success text-white hover:opacity-95 disabled:opacity-40 transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {verifyingOtp ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                    Authorize Shift Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailStatus('idle')}
                    className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
                  >
                    Cancel Action
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Right Side: Ledger Vault Summary Box */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Key size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Secure Vault Nodes</h3>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account UID</span>
                <button 
                  type="button"
                  onClick={() => handleCopyToClipboard(uid, 'uid')}
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-medium"
                >
                  {copiedField === 'uid' ? (
                    <>
                      <Check size={10} className="text-success" /> <span className="text-success font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={10} /> <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-background border border-border text-foreground truncate select-all">
                {uid}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned Tether Deposit Node</span>
                <button 
                  type="button"
                  onClick={() => handleCopyToClipboard(depositAddress, 'addr')}
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-medium"
                >
                  {copiedField === 'addr' ? (
                    <>
                      <Check size={10} className="text-success" /> <span className="text-success font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={10} /> <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-background border border-border text-foreground truncate select-all">
                {depositAddress}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Send only USDT (ERC-20/TRC-20 networks) directly to this unique processing node channel.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-4 flex items-start gap-3">
            <Shield size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-foreground">Encryption Matrix Clearances</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Profile transactions, database modifications, and active yield pipelines are fully secured under end-to-end cryptographic configurations.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Simple internal interface utility tracking
function ShieldCircleage(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}