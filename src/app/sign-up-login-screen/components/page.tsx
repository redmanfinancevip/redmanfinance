'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function AuthCallbackPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const router = useRouter();

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-danger' };
    if (score === 2) return { level: 2, label: 'Fair', color: 'bg-warning' };
    if (score === 3) return { level: 3, label: 'Good', color: 'bg-info' };
    return { level: 4, label: 'Strong', color: 'bg-success' };
  };

  const strength = getPasswordStrength(password);

  useEffect(() => {
    // Listen for the recovery event or session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsRecoveryMode(true);
      } else {
        // Small delay to allow session to initialize if it's slow
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            router.push('/sign-up-login-screen');
          } else {
            setIsRecoveryMode(true);
          }
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (strength.level < 3) {
      toast.error('Please choose a stronger password (at least "Good")');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message || 'Failed to update password');
      setIsLoading(false);
    } else {
      toast.success('Password updated successfully! Please sign in with your new password.');
      await supabase.auth.signOut(); // Ensure they log in fresh
      router.push('/sign-up-login-screen');
    }
  };

  if (!isRecoveryMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Loader2 className="animate-spin text-primary mb-4" size={32} />
        <h2 className="text-xl font-semibold text-foreground">Verifying secure link...</h2>
        <p className="text-muted-foreground mt-2">Preparing your password reset session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl slide-up">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-primary" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Reset Password</h2>
          <p className="text-muted-foreground text-sm">Enter a new secure password for your account.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field w-full px-4 py-3 text-sm pr-12"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={`strength-${level}`}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        strength.level >= level ? strength.color : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength: <span className="font-medium text-foreground">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field w-full px-4 py-3 text-sm"
              placeholder="Re-type your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}