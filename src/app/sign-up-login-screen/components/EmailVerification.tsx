'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface EmailVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onBackToSignUp: () => void;
}

export default function EmailVerification({
  email,
  onVerificationSuccess,
  onBackToSignUp,
}: EmailVerificationProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Handle resend countdown timer safely
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.trim().length === 0) {
      toast.error('Please enter the verification code sent to your email.');
      return;
    }

    setIsLoading(true);

    try {
      // Uses 'signup' to correctly parse the registration confirmation token matching default settings
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup', 
      });

      if (error) {
        console.error('Verification failure:', error);
        if (error.message.includes('invalid') || error.message.includes('expired')) {
          toast.error('Invalid or expired verification code. Please check your inbox and try again.');
        } else {
          toast.error(error.message || 'Verification failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // If the session or user is successfully validated, confirm their status
      if (data?.user || data?.session) {
        toast.success('Email verified successfully!');
        setTimeout(() => {
          onVerificationSuccess();
        }, 500);
      } else {
        toast.error('Email verification is still processing. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Unexpected runtime verification error:', err);
      toast.error(err?.message || 'An error occurred during verification. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        toast.error(error.message || 'Failed to resend code. Please try again.');
        setIsResending(false);
        return;
      }

      toast.success('A fresh verification code has been dispatched to your email!');
      setResendCountdown(60); // 60-second structural cooling window
      setIsResending(false);
    } catch (err: any) {
      console.error('Resend submission error:', err);
      toast.error(err?.message || 'Failed to resend code. Please try again.');
      setIsResending(false);
    }
  };

  const formatEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) return email;
    return `${localPart.substring(0, 3)}***@${domain}`;
  };

  return (
    <div className="slide-up">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a verification code to <span className="font-medium text-foreground">{formatEmail(email)}</span>
        </p>
      </div>

      <form onSubmit={handleVerification} className="space-y-4">
        {/* Code Input */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Verification Code</label>
          <p className="text-xs text-muted-foreground mb-2">
            Check your email (including spam and promotions folders) for the verification code.
          </p>
          <input
            type="text"
            value={code} 
            onChange={(e) => setCode(e.target.value)} // ✨ UPGRADED: Allows letters and numbers to support default tokens seamlessly
            placeholder="ENTER CODE"
            className="input-field w-full px-4 py-3 text-center tracking-widest text-2xl font-bold font-mono uppercase"
            disabled={isLoading}
          />
        </div>

        {/* Information Box */}
        <div
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <Clock size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">What's next after verification?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your $50.00 registration flow test bonus will be active</li>
              <li>You will gain direct access to your account panel</li>
              <li>Start exploring investment tiers immediately</li>
            </ul>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !code.trim()} // ✨ UPGRADED: Enabled immediately upon any code typed
          className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Verifying Token...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>Verify & Continue</span>
            </>
          )}
        </button>

        {/* Resend Button Container */}
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground mb-2">Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending || resendCountdown > 0 || isLoading}
            className="text-primary hover:text-accent font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <>
                <Loader2 size={14} className="inline animate-spin mr-1" />
                Resending...
              </>
            ) : resendCountdown > 0 ? (
              `Resend available in ${resendCountdown}s`
            ) : (
              'Resend Code'
            )}
          </button>
        </div>

        {/* Alternative Email Reset Option */}
        <div className="mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onBackToSignUp}
            className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2"
          >
            Use a different email address?
          </button>
        </div>

        {/* Spam Folder Advisory */}
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
        >
          <AlertCircle size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong>Pro Tip:</strong> If the email doesn't hit your main inbox within 2 minutes, check your spam filter.
          </p>
        </div>
      </form>
    </div>
  );
}