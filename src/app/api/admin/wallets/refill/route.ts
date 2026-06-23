import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function POST(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;

    if (adminProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { vaultId, amount } = body;

    const refillAmount = Number(amount);
    if (!vaultId || isNaN(refillAmount) || refillAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payload: vaultId and positive amount are required' }, { status: 400 });
    }

    // 1. Fetch target vault
    const { data: vault, error: fetchError } = await serviceClient
      .from('subadmin_vaults')
      .select('*')
      .eq('id', vaultId)
      .single();

    if (fetchError || !vault) {
      return NextResponse.json({ error: 'Subadmin vault not found' }, { status: 404 });
    }

    // Fetch the subadmin owner's name separately to avoid complex joins
    let ownerName = 'Subadmin';
    if (vault.subadmin_id) {
      const { data: subUser } = await serviceClient
        .from('users')
        .select('name')
        .eq('id', vault.subadmin_id)
        .single();
      if (subUser) {
        ownerName = subUser.name || 'Subadmin';
      }
    }

    const currentBalance = Number(vault.balance || 0);
    const newBalance = currentBalance + refillAmount;

    // 2. Perform vault balance update
    const { error: updateError } = await serviceClient
      .from('subadmin_vaults')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', vaultId);

    if (updateError) throw updateError;

    // 3. vault_history table does not exist in actual schema, skip logging to it
    console.log(`[POST /api/admin/wallets/refill] Skipped vault_history log for refill of $${refillAmount} to ${ownerName}`);

    // 4. Log in audit_logs
    await serviceClient.from('audit_logs').insert({
      admin_id: adminProfile.id,
      action: 'vault_refill',
      resource_type: 'vault',
      resource_id: vaultId,
      before_state: { balance: currentBalance },
      after_state: { balance: newBalance },
      ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
    });

    return NextResponse.json({
      success: true,
      message: `Successfully refilled $${refillAmount.toLocaleString()} to ${ownerName}'s vault`,
      newBalance
    });

  } catch (error: any) {
    console.error('[POST /api/admin/wallets/refill] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
