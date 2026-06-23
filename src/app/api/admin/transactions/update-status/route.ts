import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function POST(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;
    const body = await req.json();
    const { txId, action, rejectionReason } = body; // action is 'approve' or 'reject'

    if (!txId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload: txId and action (approve/reject) are required' }, { status: 400 });
    }

    // 1. Fetch the target transaction
    const { data: transaction, error: txFetchError } = await serviceClient
      .from('transactions')
      .select('*, profiles!inner(id, full_name, email, assigned_subadmin_id)')
      .eq('id', txId)
      .single();

    if (txFetchError || !transaction) {
      return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 });
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json({ error: 'Transaction is already processed' }, { status: 400 });
    }

    const isSubadmin = adminProfile.role === 'subadmin';
    const txProfile = Array.isArray(transaction.profiles) ? transaction.profiles[0] : transaction.profiles;

    // Fetch the target user profile from users table directly
    const { data: targetUser, error: userFetchError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', transaction.user_id)
      .single();

    if (userFetchError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Scope check: subadmins can only manage transactions of their assigned users
    if (isSubadmin && targetUser.upline_subadmin_id !== adminProfile.id) {
      return NextResponse.json({ error: 'Forbidden: This user is not assigned to you' }, { status: 403 });
    }

    // Amount threshold check: subadmins can only approve transactions under $10,000
    if (isSubadmin && Number(transaction.amount) >= 10000) {
      return NextResponse.json({ error: 'Forbidden: Transactions >= $10,000 must be approved by Super Admin' }, { status: 403 });
    }

    const amount = Number(transaction.amount);

    if (action === 'reject') {
      // Process rejection
      const { error: rejectError } = await serviceClient
        .from('transactions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Rejected by Admin',
          processed_by: adminProfile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', txId);

      if (rejectError) throw rejectError;

      // Log in audit logs
      await serviceClient.from('audit_logs').insert({
        admin_id: adminProfile.id,
        action: `transaction_rejected`,
        resource_type: 'transaction',
        resource_id: txId,
        before_state: { status: 'pending' },
        after_state: { status: 'rejected', reason: rejectionReason },
        ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
      });

      return NextResponse.json({ success: true, message: 'Transaction rejected successfully' });
    }

    // Process approval
    // If subadmin and type is withdrawal, we must check and deduct their sub-vault balance
    let subadminVaultId = null;
    if (isSubadmin && transaction.type === 'withdrawal') {
      const { data: vault, error: vaultFetchError } = await serviceClient
        .from('vault_accounts')
        .select('id, balance')
        .eq('owner_id', adminProfile.id)
        .eq('vault_type', 'subadmin_vault')
        .single();

      if (vaultFetchError || !vault) {
        return NextResponse.json({ error: 'Subadmin vault not found. Cannot process withdrawal.' }, { status: 400 });
      }

      if (Number(vault.balance) < amount) {
        return NextResponse.json({ error: `Insufficient vault balance. Available vault: $${Number(vault.balance).toLocaleString()}` }, { status: 400 });
      }

      subadminVaultId = vault.id;
      
      // Deduct from subadmin vault
      const { error: vaultUpdateError } = await serviceClient
        .from('vault_accounts')
        .update({
          balance: Number(vault.balance) - amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', vault.id);

      if (vaultUpdateError) throw vaultUpdateError;

      // Log in vault history
      await serviceClient.from('vault_history').insert({
        vault_id: vault.id,
        type: 'debit',
        amount: amount,
        reason: 'withdrawal_approval',
        related_tx_id: txId,
        related_user_id: targetUser.id,
        admin_id: adminProfile.id,
        note: `Approved withdrawal for ${targetUser.name}`,
        event_time: new Date().toISOString()
      });
    }

    // Update target user balances
    let newInvestmentBalance = Number(targetUser.investment_balance || 0);
    let newEarningsBalance = Number(targetUser.earnings_balance || 0);
    let newTotalInvestedLifetime = Number(targetUser.total_invested_lifetime || 0);
    let newTotalEarnedLifetime = Number(targetUser.total_earned_lifetime || 0);

    if (transaction.type === 'deposit') {
      newInvestmentBalance += amount;
      newTotalInvestedLifetime += amount;
    } else if (transaction.type === 'withdrawal') {
      if (newEarningsBalance < amount) {
        return NextResponse.json({ error: 'User has insufficient earnings balance for this withdrawal' }, { status: 400 });
      }
      newEarningsBalance -= amount;
      newTotalEarnedLifetime += amount;
    }

    // Update target user database record
    const { error: userUpdateError } = await serviceClient
      .from('users')
      .update({
        investment_balance: newInvestmentBalance,
        earnings_balance: newEarningsBalance,
        total_invested_lifetime: newTotalInvestedLifetime,
        total_earned_lifetime: newTotalEarnedLifetime,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUser.id);

    if (userUpdateError) throw userUpdateError;

    // Sync profiles table
    const newTotalBalance = newInvestmentBalance + newEarningsBalance + Number(targetUser.bonus_balance || 0);
    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({
        main_balance: newInvestmentBalance,
        earnings_balance: newEarningsBalance,
        balance: newTotalBalance,
        total_volume: newTotalInvestedLifetime,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUser.id);

    if (profileUpdateError) {
      console.error('[POST /api/admin/transactions/update-status] Profile sync warning:', profileUpdateError.message);
    }

    // Complete the transaction status
    const { error: txApproveError } = await serviceClient
      .from('transactions')
      .update({
        status: 'completed',
        processed_by: adminProfile.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', txId);

    if (txApproveError) throw txApproveError;

    // Log audit log
    await serviceClient.from('audit_logs').insert({
      admin_id: adminProfile.id,
      action: 'transaction_approved',
      resource_type: 'transaction',
      resource_id: txId,
      before_state: { status: 'pending' },
      after_state: { status: 'completed' },
      ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
    });

    return NextResponse.json({
      success: true,
      message: `Transaction approved successfully! User balance updated.`
    });

  } catch (error: any) {
    console.error('[POST /api/admin/transactions/update-status] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
