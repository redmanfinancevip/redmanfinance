'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { LineChart as ChartIcon } from 'lucide-react';

// Explicit data structure for platform earnings items
export interface EarningsDataPoint {
  date: string;
  earnings: number;
}

interface AdminEarningsChartProps {
  data?: EarningsDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="p-3 rounded-xl shadow-xl transition-all duration-150 backdrop-blur-md bg-card/95"
        style={{ border: '1px solid var(--border)', minWidth: '150px' }}
      >
        <p className="text-[11px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">{label}</p>
        <p className="font-mono text-base font-bold text-green-500">
          ${payload[0].value.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium">Platform accrual metric</p>
      </div>
    );
  }
  return null;
};

export default function AdminEarningsChart({ data = [] }: AdminEarningsChartProps) {
  // Defensive Layout Guard: Handle empty or broken data structures gracefully
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] w-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/5 gap-2">
        <ChartIcon className="text-muted-foreground/40 animate-pulse" size={24} />
        <span className="text-xs text-muted-foreground font-medium">No ledger metrics available for visual graphing</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="adminEarningsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} opacity={0.6} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
          dx={-4}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          cursor={{ stroke: 'var(--border)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="earnings"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#adminEarningsGrad)"
          dot={false}
          activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 1.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}