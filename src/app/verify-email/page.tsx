'use client';

import { Suspense } from 'react';
import EmailVerification from '@/app/sign-up-login-screen/components/EmailVerification';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {email ? (
          <EmailVerification
            email={email}
            onVerificationSuccess={() => {
              setTimeout(() => router.push('/user-dashboard'), 1500);
            }}
            onBackToSignUp={() => {
              router.push('/sign-up-login-screen');
            }}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No email provided. Please sign up first.</p>
            <button
              onClick={() => router.push('/sign-up-login-screen')}
              className="btn-primary mt-4"
            >
              Go to Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
