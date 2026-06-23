'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { LineChart } from 'lucide-react';

interface UserEarningsChartProps {
  userProfile?: any; 
  data?: any[]; 
}

export default function UserEarningsChart({ userProfile, data }: UserEarningsChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (data && data.length > 0) {
      setChartData(data);
    } else {
      // 🛡️ Admin & New Account Safeguard:
      // If an admin hasn't generated distribution updates yet, provide a elegant baseline vector
      setChartData([]);
    }
  }, [userProfile, data]);

  const isChartEmpty = chartData.length === 0;

  // Placeholder baseline array to keep the Recharts engine stable and visually balanced
  const fallbackVisualData = [
    { date: 'Phase Start', earnings: 0, cumulative: 0 },
    { date: 'Processing', earnings: 0, cumulative: 0 },
    { date: 'Live Target', earnings: 0, cumulative: 0 },
  ];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
    if (active && payload && payload.length && !isChartEmpty) {
      return (
        <div
          className="p-3 rounded-xl shadow-xl border backdrop-blur-md font-sans"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            minWidth: '170px',
          }}
        >
          <p className="text-xs text-muted-foreground mb-2 font-semibold tracking-wide uppercase text-[10px]">{label}</p>
          {payload.map((entry, i) => (
            <div key={`tt-entry-${i}`} className="flex items-center justify-between gap-4 mt-1">
              <span className="text-xs text-muted-foreground capitalize">{entry.name}:</span>
              <span className="font-mono-nums text-xs font-bold text-foreground">
                {/* Support high-precision millisecond ticking tracking parameters */}
                ${entry.value >= 1 ? entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : entry.value.toFixed(5)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full h-[220px]">
      {/* 🔐 Interactive Empty Overlay for Admin/Sub-Admin Diagnostic Context */}
      {isChartEmpty && (
        <div className="absolute inset-0 bg-card/40 border border-dashed border-border/80 rounded-xl z-10 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
          <div className="p-2 rounded-lg bg-muted/50 border border-border text-muted-foreground mb-2 animate-pulse">
            <LineChart size={16} />
          </div>
          <p className="text-xs font-bold text-foreground tracking-wide">Awaiting Settlement Node Activity</p>
          <p className="text-[10px] text-muted-foreground text-center mt-0.5 max-w-[240px]">
            Once the ledger updates or an administrator fires the target funding yield loop, performance analytics materialize here.
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={isChartEmpty ? fallbackVisualData : chartData} 
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={isChartEmpty ? 0.03 : 0.3} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={isChartEmpty ? 0.02 : 0.25} />
              <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={isChartEmpty ? 0.3 : 1} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            hide={isChartEmpty}
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            hide={isChartEmpty}
          />
          {!isChartEmpty && <Tooltip content={<CustomTooltip />} />}
          <Area
            type="monotone"
            dataKey="earnings"
            name="Daily Yield"
            stroke={isChartEmpty ? "var(--border)" : "var(--primary)"}
            strokeWidth={isChartEmpty ? 1 : 2}
            fill="url(#earningsGradient)"
            dot={false}
            activeDot={isChartEmpty ? false : { r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            name="Cumulative Gross"
            stroke={isChartEmpty ? "var(--border)" : "var(--success)"}
            strokeWidth={isChartEmpty ? 1 : 1.5}
            strokeDasharray={isChartEmpty ? "0" : "4 4"}
            fill="url(#cumulativeGradient)"
            dot={false}
            activeDot={isChartEmpty ? false : { r: 3, fill: 'var(--success)', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}