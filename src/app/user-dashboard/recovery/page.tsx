// src/app/user-dashboard/recovery/page.tsx

import RecoveryWizard from '@/components/RecoveryWizardV2';
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Asset Recovery & Forensic Ledger Hub',
  description: 'Institutional‑grade asset recovery wizard with KYC and settlement timer.',
};

export default async function RecoveryPage() {
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) redirect('/login');

  let initialRecoveryData = null;
  if (user) {
    const { data, error } = await supabaseServer
      .from('asset_recoveries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) initialRecoveryData = data[0];
  }

  return (
    <section className="min-h-screen bg-[#111111] text-white py-8 px-4 lg:px-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-orange-500">Asset Recovery &amp; Forensic Ledger Hub</h1>
        <p className="mt-2 text-muted-foreground">Securely recover lost or intercepted assets through our institutional‑grade workflow.</p>
      </header>
      <RecoveryWizard initialData={initialRecoveryData} />
    </section>
  );
}
