'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import UpdatePasswordForm from './UpdatePasswordForm';
import AuthBrandPanel from './AuthBrandPanel';

export default function AuthPageClient() {
  // 1. Allow 'update-password' as a valid structural tab state
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'update-password'>('login');
  const searchParams = useSearchParams();

  // 2. Read incoming URL parameters when the page renders
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'update-password') {
      setActiveTab('update-password');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Brand Panel */}
      <AuthBrandPanel />

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16 xl:px-24 min-h-screen">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E8500A 0%, #FF6B35 100%)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L17 10L10 18L3 10L10 2Z" fill="white" fillOpacity="0.9" />
                <path d="M4 10L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Redman Finance</span>
          </div>

          {/* Tab Switcher - Only display tabs if the user is not updating their password */}
          {activeTab !== 'update-password' && (
            <div className="flex rounded-xl p-1 mb-8" style={{ backgroundColor: 'var(--muted)' }}>
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Form Area Dynamic Routing */}
          <div className="fade-in">
            {activeTab === 'login' && (
              <LoginForm onSwitchToSignup={() => setActiveTab('signup')} />
            )}
            {activeTab === 'signup' && (
              <SignUpForm onSwitchToLogin={() => setActiveTab('login')} />
            )}
            {activeTab === 'update-password' && (
              <UpdatePasswordForm />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}