import { Suspense } from 'react';
import AuthPageClient from './components/AuthPageClient';

function AuthPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground animate-pulse font-semibold">Loading authentication...</div>
    </div>
  );
}

export default function SignUpLoginPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageClient />
    </Suspense>
  );
}