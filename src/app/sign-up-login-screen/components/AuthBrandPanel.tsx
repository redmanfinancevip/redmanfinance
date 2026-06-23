'use client';

import React from 'react';

const platformStats = [
  { label: 'Assets Under Management', value: '$284.7M', change: '+12.4%' },
  { label: 'Active Investors', value: '18,492', change: '+847 this month' },
  { label: 'Avg. Monthly Return', value: '4.8%', change: 'Across all plans' },
];

const testimonials = [
  {
    id: 'test-001',
    name: 'Marcus Okonkwo',
    role: 'Portfolio Investor',
    text: 'My portfolio grew 38% in 6 months. The earnings dashboard is real-time and transparent.',
    avatar: 'MO',
  },
  {
    id: 'test-002',
    name: 'Priya Venkataraman',
    role: 'Crypto Allocator',
    text: 'The compliance grade system gave me confidence the platform is institutionally managed.',
    avatar: 'PV',
  },
];

export default function AuthBrandPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-[520px] xl:w-[600px] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #111114 0%, #0D0D0F 60%, #160A04 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 30%, rgba(232,80,10,0.12) 0%, transparent 60%)',
        }}
      />
      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-16">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #E8500A 0%, #FF6B35 100%)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L20 12L12 22L4 12L12 2Z" fill="white" fillOpacity="0.95" />
              <path d="M5 12L19 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground tracking-tight">Redman Finance</div>
            <div className="text-xs text-muted-foreground font-medium">Institutional Investment Platform</div>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-12">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
            <span className="text-foreground">Grow wealth with</span>
            <br />
            <span className="text-gradient-primary">institutional precision</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
            Multi-tier crypto investment plans with real-time earnings accrual, compliance-grade account management, and institutional custody.
          </p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 gap-3 mb-12">
          {platformStats?.map((stat) => (
            <div
              key={`stat-${stat?.label}`}
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm text-muted-foreground">{stat?.label}</span>
              <div className="text-right">
                <div className="font-mono-nums text-base font-bold text-foreground">{stat?.value}</div>
                <div className="text-xs text-success">{stat?.change}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Testimonials */}
      <div className="relative z-10 space-y-4">
        {testimonials?.map((t) => (
          <div
            key={t?.id}
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">&ldquo;{t?.text}&rdquo;</p>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
              >
                {t?.avatar}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{t?.name}</div>
                <div className="text-xs text-muted-foreground">{t?.role}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Security badges */}
        <div className="flex items-center gap-4 pt-2">
          {['256-bit Encryption', 'SOC 2 Compliant', 'KYC Verified']?.map((badge) => (
            <div key={`badge-${badge}`} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}