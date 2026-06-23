'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isForgotPasswordFlow, setIsForgotPasswordFlow] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setAuthError('');

    if (isForgotPasswordFlow) {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback`, // Supabase will redirect here after user clicks link in email
      });

      if (error) {
        setAuthError(error.message);
        toast.error(error.message || 'Failed to send password reset email. Please check your email address.');
      } else {
        toast.success('Password reset link sent to your email! Please check your inbox (and spam folder).');
        // Optionally, switch back to login view or show a success message
        setIsForgotPasswordFlow(false);
        // Clear form fields if desired, or let user try logging in
        // reset({ email: data.email, password: '', rememberMe: false });
      }
      setIsLoading(false);
      return;
    }

    // Existing login logic below

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
      return;
    }

    // Safety check: Ensure profile exists in the public 'users' table
    // This handles cases where the signup insert might have failed
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', authData.user?.id)
      .maybeSingle();

    if (!existingProfile && authData.user) {
      const hasReferral = !!authData.user.user_metadata?.referral_code;
      const initialBonus = hasReferral ? 600 : 500;

      await supabase.from('users').insert({
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.full_name || 'Investor',
        role: authData.user.user_metadata?.role || 'user',
        account_status: 'active',
        bonus_balance: initialBonus
      });
    }

    // Redirect logic based on user metadata role
    // Default to 'user' if no role is found
    const role = authData.user?.user_metadata?.role || 'user';
    let targetRoute = '/user-dashboard';

    if (role === 'super_admin') {
      targetRoute = '/super-admin-dashboard';
    } else if (role === 'subadmin') {
      targetRoute = '/subadmin-dashboard';
    }

    toast.success(`Welcome back! Signing you in...`);
    
    // Small delay to allow the toast to be seen before redirect
    setTimeout(() => {
      router.push(targetRoute);
    }, 800);
  };

  return (
    <div className="slide-up">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
        <p className="text-muted-foreground text-sm">Sign in to access your investment portfolio</p>
      </div>

      {authError && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6"
          style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
          <p className="text-sm text-danger">{authError}</p>
        </div>
      )}

      {isForgotPasswordFlow ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-foreground mb-2">Reset Your Password</h3>
            <p className="text-muted-foreground text-sm">
              Enter your email address below and we'll send you a link to reset your password.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="input-field w-full px-4 py-3 text-sm"
              placeholder="you@example.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
              })}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {isLoading ? (<><Loader2 size={16} className="animate-spin" /><span>Sending Link...</span></>) : ('Send Reset Link')}
          </button>
          <button
            type="button"
            onClick={() => { setIsForgotPasswordFlow(false); setAuthError(''); }}
            className="w-full py-3 text-sm font-semibold border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Back to Login
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <input
            type="email"
            className="input-field w-full px-4 py-3 text-sm"
            placeholder="you@example.com"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
            })}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Password</label>
            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordFlow(true);
                setAuthError(''); // Clear any previous errors
              }}
              className="text-xs text-primary hover:text-accent transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field w-full px-4 py-3 text-sm pr-12"
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
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
          {errors.password && (
            <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="rememberMe"
            className="w-4 h-4 rounded accent-primary cursor-pointer"
            {...register('rememberMe')}
          />
          <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            'Sign In to Dashboard'
          )}
        </button>
        </form>
      )}

      {/* Security note */}
      <div className="flex items-center gap-2 mt-6 justify-center">
        <ShieldCheck size={14} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          256-bit TLS encrypted. Session expires after inactivity.
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        No account yet?{' '}
        <button
          onClick={onSwitchToSignup}
          className="text-primary hover:text-accent font-semibold transition-colors"
        >
          Create one free
        </button>
      </p>
    </div>
  );
}