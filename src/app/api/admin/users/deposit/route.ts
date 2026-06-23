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
    const { userId, amount, backdateDate } = body;

    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payload: userId and positive amount are required' }, { status: 400 });
    }

    // 1. Fetch the target user to get their current state before update
    const { data: targetUser, error: fetchError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Subadmins can only deposit to users assigned to them
    if (adminProfile.role === 'subadmin' && targetUser.upline_subadmin_id !== adminProfile.id) {
      return NextResponse.json({ error: 'Forbidden: You can only adjust balances of assigned users' }, { status: 403 });
    }

    const currentInvestmentBalance = Number(targetUser.investment_balance || 0);
    const currentLifetimeInvested = Number(targetUser.total_invested_lifetime || 0);

    const newInvestmentBalance = currentInvestmentBalance + amount;
    const newLifetimeInvested = currentLifetimeInvested + amount;

    // 2. Perform the update on users table
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        investment_balance: newInvestmentBalance,
        total_invested_lifetime: newLifetimeInvested,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: `Balance update failed: ${updateError.message}` }, { status: 500 });
    }

    // Calculate total balance for profiles table (main_balance + earnings_balance + bonus_balance)
    const newTotalBalance = newInvestmentBalance + Number(targetUser.earnings_balance || 0) + Number(targetUser.bonus_balance || 0);

    // Sync profiles table
    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({
        main_balance: newInvestmentBalance,
        balance: newTotalBalance,
        total_volume: newLifetimeInvested,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('[POST /api/admin/users/deposit] Profiles sync warning:', profileUpdateError.message);
    }

    // 3. Create approved transaction record
    const parseLocalDateIfNeeded = (input: any) => {
      if (!input) return new Date().toISOString();
      try {
        // Accept 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' as local
        const localDateTimeRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
        if (typeof input === 'string' && localDateTimeRegex.test(input)) {
          const dt = new Date(input);
          return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
        }
        const dt2 = new Date(input);
        if (isNaN(dt2.getTime())) return new Date().toISOString();
        return dt2.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    const txTimestamp = parseLocalDateIfNeeded(backdateDate);
    const { data: transaction, error: txError } = await serviceClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: amount,
        asset: 'USD',
        status: 'completed',
        processed_by: adminProfile.id,
        note: 'Manual deposit injection',
        created_at: txTimestamp
      })
      .select()
      .single();

    if (txError) {
      console.error('[POST /api/admin/users/deposit] Transaction logging failed:', txError.message);
      // We continue since the balance was already updated, but log it
    }

    // 4. Log in audit_logs
    await serviceClient.from('audit_logs').insert({
      admin_id: adminProfile.id,
      action: 'manual_deposit_injection',
      resource_type: 'user',
      resource_id: userId,
      before_state: { investment_balance: currentInvestmentBalance, total_invested_lifetime: currentLifetimeInvested },
      after_state: { investment_balance: newInvestmentBalance, total_invested_lifetime: newLifetimeInvested },
      ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deposited $${amount.toLocaleString()} to ${targetUser.name || targetUser.email}`,
      transaction
    });
  } catch (error: any) {
    console.error('[POST /api/admin/users/deposit] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
