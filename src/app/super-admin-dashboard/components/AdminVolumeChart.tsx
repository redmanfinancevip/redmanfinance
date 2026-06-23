'use client';

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';

// Upgraded mock structure — ready to mirror your backend aggregation 
// where we map both incoming deposits and ledger withdrawals by date.
const databaseMockData = [
  { date: 'May 31', deposit: 128000, withdrawal: 45000 },
  { date: 'Jun 1',  deposit: 214000, withdrawal: 92000 },
  { date: 'Jun 2',  deposit: 98000,  withdrawal: 110000 }, // Negative Net flow example
  { date: 'Jun 3',  deposit: 187000, withdrawal: 60000 },
  { date: 'Jun 4',  deposit: 156000, withdrawal: 48000 },
  { date: 'Jun 5',  deposit: 232000, withdrawal: 130000 },
  { date: 'Jun 6',  deposit: 145000, withdrawal: 55000 },
  { date: 'Jun 7',  deposit: 198000, withdrawal: 72000 },
  { date: 'Jun 8',  deposit: 167000, withdrawal: 80000 },
  { date: 'Jun 9',  deposit: 221000, withdrawal: 95000 },
  { date: 'Jun 10', deposit: 134000, withdrawal: 40000 },
  { date: 'Jun 11', deposit: 289000, withdrawal: 150000 },
  { date: 'Jun 12', deposit: 176000, withdrawal: 62000 },
  { date: 'Jun 13', deposit: 203000, withdrawal: 88000 },
];

type MetricType = 'deposit' | 'withdrawal' | 'net';

const CustomTooltip = ({ active, payload, label, currentMetric }: { 
  active?: boolean; 
  payload?: any[]; 
  label?: string;
  currentMetric: MetricType;
}) => {
  if (active && payload && payload.length) {
    const rawValue = payload[0].value;
    const formattedValue = (rawValue / 1000).toFixed(1) + 'k';
    const originalEntry = payload[0].payload;

    return (
      <div
        className="p-3 rounded-xl shadow-xl space-y-1.5 text-xs"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="text-muted-foreground font-medium">{label}</p>
        <div className="space-y-0.5">
          <p className="font-mono-nums text-sm font-bold text-foreground">
            Current Filter: <span className={rawValue >= 0 ? "text-primary" : "text-danger"}>
              {rawValue < 0 ? '-' : ''}${Math.abs(rawValue).toLocaleString()}
            </span>
          </p>
          {currentMetric === 'net' && (
            <p className="text-[10px] text-muted-foreground font-mono-nums">
              (In: ${originalEntry.deposit.toLocaleString()} | Out: ${originalEntry.withdrawal.toLocaleString()})
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminVolumeChart() {
  const [metric, setMetric] = useState<MetricType>('deposit');

  // Dynamically compile metrics based on chosen dashboard view filter
  const chartData = databaseMockData.map(d => {
    let displayValue = d.deposit;
    if (metric === 'withdrawal') displayValue = d.withdrawal;
    if (metric === 'net') displayValue = d.deposit - d.withdrawal;

    return {
      date: d.date,
      displayValue,
      deposit: d.deposit,
      withdrawal: d.withdrawal
    };
  });

  // Calculate high ceiling thresholds cleanly avoiding empty collection runtime crashes
  const valuesArray = chartData.map(d => d.displayValue);
  const maxVal = valuesArray.length > 0 ? Math.max(...valuesArray) : 0;
  const minVal = valuesArray.length > 0 ? Math.min(...valuesArray) : 0;

  return (
    <div className="space-y-4 w-full">
      {/* Dynamic Selector Header Control tabs */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity size={12} className="text-primary" />
          Ledger Flows
        </span>
        <div className="flex bg-muted p-1 rounded-lg gap-1">
          <button
            type="button"
            onClick={() => setMetric('deposit')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
              metric === 'deposit' ? 'bg-card text-success shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownLeft size={12} />
            Deposits
          </button>
          <button
            type="button"
            onClick={() => setMetric('withdrawal')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
              metric === 'withdrawal' ? 'bg-card text-danger shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpRight size={12} />
            Withdrawals
          </button>
          <button
            type="button"
            onClick={() => setMetric('net')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
              metric === 'net' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Net Flow
          </button>
        </div>
      </div>

      {/* Main Responsive Render Container */}
      <ResponsiveContainer width="100%" height={210}>
        <BarChart 
          data={chartData} 
          margin={{ top: 8, right: 4, left: -24, bottom: 0 }} 
          barSize={12}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => {
              const sign = v < 0 ? '-' : '';
              return `${sign}$${(Math.abs(v) / 1000).toFixed(0)}k`;
            }}
          />
          <Tooltip content={<CustomTooltip currentMetric={metric} />} cursor={{ fill: 'var(--muted)', opacity: 0.15 }} />
          
          <Bar dataKey="displayValue" radius={metric === 'net' ? [2, 2, 2, 2] : [4, 4, 0, 0]}>
            {chartData.map((entry, index) => {
              let cellColor = 'rgba(232,80,10,0.3)'; // Default transparent primary base

              if (metric === 'net') {
                // Net value configurations
                if (entry.displayValue < 0) {
                  cellColor = entry.displayValue === minVal ? 'var(--danger)' : 'rgba(239,68,68,0.4)';
                } else {
                  cellColor = entry.displayValue === maxVal ? 'var(--primary)' : 'rgba(232,80,10,0.4)';
                }
              } else if (metric === 'withdrawal') {
                // Pure withdrawal metrics colors
                cellColor = entry.displayValue === maxVal ? 'var(--danger)' : 'rgba(239,68,68,0.35)';
              } else {
                // Pure deposit peak highlighting matches original style 
                cellColor = entry.displayValue === maxVal ? 'var(--primary)' : 'rgba(232,80,10,0.35)';
              }

              return (
                <Cell
                  key={`vol-bar-extended-${index}`}
                  fill={cellColor}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}