'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/utils/supabaseClient';

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [strength, setStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('Weak');
  const [strengthColor, setStrengthColor] = useState('bg-destructive');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const supabase = getSupabaseClient();

  // Hidden state to hold tokens parsed automatically from the URL
  const [urlTokens, setUrlTokens] = useState<{ email: string; token: string } | null>(null);

  // 🔍 Silently capture tokens from URL search parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const emailParam = searchParams.get('email');
      const tokenParam = searchParams.get('token');

      if (emailParam && tokenParam) {
        setUrlTokens({ email: emailParam, token: tokenParam });
        console.log("✅ [UX SUCCESS] Hidden recovery tokens securely captured from link.");
      } else {
        console.warn("⚠️ [UX WARNING] No token parameters found in URL.");
        setMessage({
          type: 'error',
          text: 'Security session invalid or expired. Please click the link directly from your email.'
        });
      }
    }
  }, []);

  // Password Strength Calculation
  useEffect(() => {
    let score = 0;
    if (!password) {
      setStrength(0);
      setStrengthLabel('Too Short');
      setStrengthColor('bg-muted');
      return;
    }
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    setStrength(score);
    switch (score) {
      case 1: setStrengthLabel('Weak'); setStrengthColor('bg-destructive'); break;
      case 2: setStrengthLabel('Fair'); setStrengthColor('bg-amber-500'); break;
      case 3: setStrengthLabel('Good'); setStrengthColor('bg-blue-500'); break;
      case 4: setStrengthLabel('Strong & Secure'); setStrengthColor('bg-emerald-500'); break;
    }
  }, [password]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!urlTokens) {
      setMessage({ type: 'error', text: 'Authentication reference missing. Request a new link.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Exchange the hidden URL token for a session completely behind the scenes
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: urlTokens.email,
        token: urlTokens.token,
        type: 'recovery',
      });

      if (verifyError) {
        setMessage({ type: 'error', text: `Link expired or invalid: ${verifyError.message}` });
        setLoading(false);
        return;
      }

      // 2. Run the update within that newly established session context
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setMessage({ type: 'error', text: updateError.message });
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully! Redirecting you to login...' });
        setTimeout(() => {
          router.push('/sign-up-login-screen'); 
        }, 2000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected validation error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Set New Password</h2>
        <p className="text-sm text-muted-foreground">Please enter your secure new password below.</p>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-5">
        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              disabled={!urlTokens || loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="••••••••"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1 h-1 w-full rounded-full bg-muted">
                <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(strength / 4) * 100}%` }} />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Strength: {strengthLabel}</p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              disabled={!urlTokens || loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="••••••••"
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm transition-all ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
            {message.text}
          </div>
        )}

        <button 
          type="submit" 
          disabled={!urlTokens || loading} 
          className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Processing Update...' : 'Confirm & Update Password'}
        </button>
      </form>
    </div>
  );
}