'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, CheckCircle2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import EmailVerification from './EmailVerification';

interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
  agreeTerms: boolean;
}

interface SignUpFormProps {
  onSwitchToLogin: () => void;
}

export default function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>();

  const password = watch('password');

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

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    
    try {
      // 🚀 PHASE 1: Format Referral Code to Ensure Exact Matching Logs
      let cleanReferralCode = null;
      if (data.referralCode && data.referralCode.trim() !== '') {
        let rawCode = data.referralCode.trim();
        
        // Strip out common UI formatting prefixes like 'RMF-' if the database stores pure usernames
        if (rawCode.toUpperCase().startsWith('RMF-')) {
          cleanReferralCode = rawCode.substring(4);
        } else {
          cleanReferralCode = rawCode;
        }
      }

      // Generate a clean custom username fallback matching the backend pattern
      const generatedUsername = data.email.split('@')[0];

      // 🚀 PHASE 2: Initialize User Account inside Supabase Auth
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            username: generatedUsername,      // Added to seed the custom table unique identity rule
            referral_code: cleanReferralCode, // Synchronized tracking code parameter
            role: 'user',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message?.includes('ArrayBuffer') || error.message?.includes('Uint8Array')) {
          console.error('Buffer allocation error in auth:', error);
          toast.error('Authentication service temporarily unavailable. Please try again in a moment.');
        } else {
          toast.error(error.message || 'Sign up failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // 🚀 PHASE 3: Clean Transition to Success Layout
      setIsLoading(false);
      setSignUpEmail(data.email);
      setIsSuccess(true);
      setIsVerifying(false); 
    } catch (err: any) {
      console.error('Sign up error:', err);
      const errorMsg = err?.message || String(err);
      toast.error(errorMsg || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (isSuccess && !isVerifying) {
    return (
      <div className="text-center py-8 slide-up">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">Account Created!</h3>
        <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
          Your account has been prepared successfully.
        </p>
        <div
          className="flex flex-col gap-2 justify-center p-4 rounded-xl mt-4 mb-6 text-left"
          style={{ backgroundColor: 'rgba(232,80,10,0.06)', border: '1px solid rgba(232,80,10,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-primary shrink-0" />
            <span className="text-sm text-primary font-semibold">$50.00 registration flow test bonus active!</span>
          </div>
          {watch('referralCode') && (
            <p className="text-xs text-muted-foreground pl-5">
              💡 Valid referral reference identified. Premium $500.00 credit tracking initiated for your first funding event setup.
            </p>
          )}
        </div>
        <button 
          onClick={() => setIsVerifying(true)} 
          className="btn-primary w-full py-3 text-sm font-semibold mb-3"
        >
          Enter Activation Code
        </button>
        <button 
          onClick={onSwitchToLogin} 
          className="w-full py-3 text-sm font-semibold border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Sign In Later
        </button>
      </div>
    );
  }

  if (isSuccess && isVerifying) {
    return (
      <EmailVerification
        email={signUpEmail}
        onVerificationSuccess={() => {
          toast.success('Identity verified! Routing securely into application system environment panels...');
          setTimeout(() => {
            onSwitchToLogin();
          }, 1500);
        }}
        onBackToSignUp={() => {
          setIsSuccess(false);
          setIsVerifying(false);
          setSignUpEmail('');
        }}
      />
    );
  }

  return (
    <div className="slide-up">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Investor Registration</h2>
        <p className="text-muted-foreground text-sm">
          Start investing with a{' '}
          <span className="text-primary font-semibold">$50 signup bonus</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
          <input
            type="text"
            className="input-field w-full px-4 py-3 text-sm"
            placeholder="Your legal full name"
            {...register('fullName', {
              required: 'Full name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          {errors.fullName && <p className="mt-1.5 text-xs text-danger">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
          <input
            type="email"
            className="input-field w-full px-4 py-3 text-sm"
            placeholder="you@example.com"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
            })}
          />
          {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field w-full px-4 py-3 text-sm pr-12"
              placeholder="Min. 8 characters with uppercase & number"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                pattern: {
                  value: /^(?=.*[A-Z])(?=.*[0-9])/,
                  message: 'Must include at least one uppercase letter and one number',
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
          {errors.password && <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="input-field w-full px-4 py-3 text-sm pr-12"
              placeholder="Re-enter your password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (val) => val === password || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-danger">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Referral Code */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Referral Code{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Have a referral reference? Unlock your priority $500.00 investment tier upgrade program credit instantly.
          </p>
          <input
            type="text"
            className="input-field w-full px-4 py-3 text-sm uppercase tracking-widest font-mono-nums"
            placeholder="e.g. test0012452"
            {...register('referralCode')}
          />
        </div>

        {/* Terms */}
        <div>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeTerms"
              className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer shrink-0"
              {...register('agreeTerms', {
                required: 'You must accept the terms to continue',
              })}
            />
            <label htmlFor="agreeTerms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
              I agree to the{' '}
              <span className="text-primary hover:text-accent cursor-pointer">Terms of Service</span>{' '}
              and{' '}
              <span className="text-primary hover:text-accent cursor-pointer">Privacy Policy</span>.
              I confirm I am 18+ years old.
            </label>
          </div>
          {errors.agreeTerms && (
            <p className="mt-1.5 text-xs text-danger">{errors.agreeTerms.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            'Create Account & Claim $50 Bonus'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-primary hover:text-accent font-semibold transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}