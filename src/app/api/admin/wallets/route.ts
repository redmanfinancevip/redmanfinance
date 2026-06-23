import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function GET(req: Request) {
  const adminContext = await verifyAdmin(req);
  if ('error' in adminContext) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  const { serviceClient } = adminContext;

  try {
    let platformWallets: any[] = [];
    try {
      const { data, error: walletError } = await serviceClient
        .from('crypto_wallets')
        .select('*')
        .order('created_at', { ascending: true });
      if (!walletError && data) {
        platformWallets = data;
      }
    } catch (e) {
      console.warn("crypto_wallets table not available, using empty array");
    }

    // Fetch subadmins to map their vaults
    const { data: subs, error: subsError } = await serviceClient
      .from('users')
      .select('id, name, email')
      .eq('role', 'subadmin');

    if (subsError) throw subsError;

    const mappedSubadminVaults = [];

    for (const sub of (subs || [])) {
      const { data: vault, error: vaultError } = await serviceClient
        .from('subadmin_vaults')
        .select('*')
        .eq('subadmin_id', sub.id)
        .maybeSingle();

      if (vaultError) continue;

      // Type Guard: If this specific subadmin has no vault row, create a safe fallback object
      if (!vault) {
        mappedSubadminVaults.push({
          id: `unassigned-${sub.id}`,
          subadmin: sub.name || 'Subadmin',
          email: sub.email || '',
          balance: 0,
          assignedUsers: 0,
          lastRefillDate: 'Never',
          status: 'unassigned'
        });
        continue;
      }

      const { count: userCount, error: countError } = await serviceClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('upline_subadmin_id', sub.id);
      
      if (countError) throw countError;

      const lastRefillDate = 'Never';

      const balance = Number(vault.balance || 0);
      const status = balance <= 0 ? 'empty' : balance < 5000 ? 'low' : 'active';

      mappedSubadminVaults.push({
        id: vault.id,
        subadmin: sub.name || 'Subadmin',
        email: sub.email || '',
        balance: balance,
        assignedUsers: userCount || 0,
        lastRefillDate,
        status
      });
    }

    return NextResponse.json({
      platformWallets: platformWallets || [],
      subadminVaults: mappedSubadminVaults
    }, { status: 200 });

  } catch (error: any) {
    console.error('Exception mapping admin wallet configuration:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
