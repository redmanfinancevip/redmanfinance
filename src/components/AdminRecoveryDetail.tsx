"use client";

import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AdminRecoveryDetail({ recovery, onAction }: { recovery: any, onAction: (a: string) => void }) {
  return (
    <div className="p-6 bg-[#0b0b0b] rounded-md border border-neutral-800 text-white">
      <div className="flex items-center gap-3 mb-4">
        <ShieldAlert className="w-6 h-6 text-orange-500" />
        <h3 className="text-lg font-semibold">Recovery Case</h3>
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-neutral-300">
        <div>
          <dt className="font-medium text-neutral-400">User</dt>
          <dd>{recovery?.user_id}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-400">Asset</dt>
          <dd>{recovery?.asset_ticker} — {recovery?.discovered_balance}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-400">Source</dt>
          <dd>{recovery?.source_address}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-400">Status</dt>
          <dd className="font-semibold">{recovery?.status}</dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-3">
        <button onClick={() => onAction('verify')} className="bg-neutral-800 px-4 py-2 rounded-md">Verify Documents & Push to Audit</button>
        <button onClick={() => onAction('lock')} className="bg-red-600 px-4 py-2 rounded-md text-white">Lock Case</button>
        <button onClick={() => onAction('disburse')} className="bg-green-600 px-4 py-2 rounded-md text-white">Disbursal Switch (Super Admin)</button>
      </div>
    </div>
  );
}
