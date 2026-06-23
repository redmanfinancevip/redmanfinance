import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function GET(req: Request) {
  const adminContext = await verifyAdmin(req);
  if ('error' in adminContext) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  const { serviceClient, profile } = adminContext;

  try {
    let { data: vault, error: vaultError } = await serviceClient
      .from('subadmin_vaults')
      .select('*')
      .eq('subadmin_id', profile.id)
      .maybeSingle();

    if (vaultError) throw vaultError;

    // Strict Type Guard: If no vault exists yet, return an unassigned baseline structure safely
    if (!vault) {
      return NextResponse.json({
        vault: { id: '', balance: 0, currency: 'USD', status: 'unassigned' },
        refillHistory: [],
        disburseHistory: [],
        totalDisbursed: 0,
        pendingCount: 0
      }, { status: 200 });
    }

    // Now TypeScript knows completely that vault is NOT null here
    const lastRefill = null;
    const totalDisbursed = 0;

    return NextResponse.json({
      vault: {
        id: vault.id,
        balance: Number(vault.balance || 0),
        currency: vault.asset || 'USD',
        status: vault.status || 'active'
      },
      lastRefill: lastRefill || null,
      totalDisbursed,
      refillHistory: [],
      disburseHistory: []
    }, { status: 200 });

  } catch (error: any) {
    console.error('Exception inside vault API routing utility:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
