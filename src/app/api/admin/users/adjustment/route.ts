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
    const { userId, amount, type, backdateDate, notes } = body;

    // Validation
    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payload: userId and positive amount required' }, { status: 400 });
    }

    if (type !== 'deposit' && type !== 'withdrawal') {
      return NextResponse.json({ error: 'Invalid type: must be deposit or withdrawal' }, { status: 400 });
    }

    // 1. Fetch the target user
    const { data: targetUser, error: fetchError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Permission check: subadmins can only adjust balances of assigned users
    if (adminProfile.role === 'subadmin' && targetUser.upline_subadmin_id !== adminProfile.id) {
      return NextResponse.json({ error: 'Forbidden: You can only adjust balances of assigned users' }, { status: 403 });
    }

    const currentInvestmentBalance = Number(targetUser.investment_balance || 0);

    let newInvestmentBalance: number;

    if (type === 'deposit') {
      // Deposit: add to investment balance
      newInvestmentBalance = currentInvestmentBalance + amount;
    } else {
      // Withdrawal: subtract from balance only
      if (currentInvestmentBalance < amount) {
        return NextResponse.json({ 
          error: `Insufficient balance. Current: $${currentInvestmentBalance.toLocaleString()}, Requested: $${amount.toLocaleString()}` 
        }, { status: 400 });
      }
      newInvestmentBalance = currentInvestmentBalance - amount;
    }

    // 2. Update users table
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        investment_balance: newInvestmentBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: `Balance update failed: ${updateError.message}` }, { status: 500 });
    }

    // Calculate total balance for profiles table
    const earningsBalance = Number(targetUser.earnings_balance || 0);
    const bonusBalance = Number(targetUser.bonus_balance || 0);
    const newTotalBalance = newInvestmentBalance + earningsBalance + bonusBalance;

    // 3. Sync profiles table
    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({
        main_balance: newInvestmentBalance,
        balance: newTotalBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('[POST /api/admin/users/adjustment] Profiles sync warning:', profileUpdateError.message);
    }

    // 4. Create transaction record with proper timestamps
    const parseLocalDateIfNeeded = (input: any) => {
      if (!input) return new Date().toISOString();
      try {
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
    const actionLabel = type === 'deposit' ? 'Manual deposit' : 'Manual withdrawal';
    
    const { data: transaction, error: txError } = await serviceClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: type,
        amount: amount,
        asset: 'USD',
        status: 'completed',
        processed_by: adminProfile.id,
        note: notes ? `${actionLabel} by admin: ${notes}` : `${actionLabel} by admin`,
        created_at: txTimestamp
      })
      .select()
      .single();

    if (txError) {
      console.error('[POST /api/admin/users/adjustment] Transaction logging failed:', txError.message);
    }

    // 5. Create audit log
    await serviceClient.from('audit_logs').insert({
      admin_id: adminProfile.id,
      action: `manual_${type}_adjustment`,
      resource_type: 'user',
      resource_id: userId,
      before_state: { 
        investment_balance: currentInvestmentBalance
      },
      after_state: { 
        investment_balance: newInvestmentBalance
      },
      metadata: {
        type: type,
        amount: amount,
        backdated: !!backdateDate,
        original_timestamp: new Date().toISOString(),
        notes: notes || undefined
      },
      ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
    });

    const verb = type === 'deposit' ? 'Deposited' : 'Withdrawn';
    return NextResponse.json({
      success: true,
      message: `Successfully ${verb.toLowerCase()} $${amount.toLocaleString()} ${type === 'deposit' ? 'to' : 'from'} ${targetUser.name || targetUser.email}`,
      transaction,
      balanceUpdate: {
        previousBalance: currentInvestmentBalance,
        newBalance: newInvestmentBalance,
        change: type === 'deposit' ? `+$${amount.toLocaleString()}` : `-$${amount.toLocaleString()}`
      }
    });
  } catch (error: any) {
    console.error('[POST /api/admin/users/adjustment] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
