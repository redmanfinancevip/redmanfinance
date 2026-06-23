'use client';

import React from 'react';
import UpdatePasswordForm from '../sign-up-login-screen/components/UpdatePasswordForm';
import AuthBrandPanel from '../sign-up-login-screen/components/AuthBrandPanel';

export default function UpdatePasswordPage() {
  // Re-uses your beautiful login page styling but locks it to the update form directly!
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

          {/* Form Area Locked directly to the update form component */}
          <div className="fade-in">
            <UpdatePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}