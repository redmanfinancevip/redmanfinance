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
    const { userIds, amount, type, backdateDate, notes } = body;

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: userIds array required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payload: positive amount required' }, { status: 400 });
    }

    if (type !== 'deposit' && type !== 'withdrawal') {
      return NextResponse.json({ error: 'Invalid type: must be deposit or withdrawal' }, { status: 400 });
    }

    // Fetch all target users
    const { data: targetUsers, error: fetchError } = await serviceClient
      .from('users')
      .select('*')
      .in('id', userIds);

    if (fetchError || !targetUsers || targetUsers.length === 0) {
      return NextResponse.json({ error: 'One or more users not found' }, { status: 404 });
    }

    // Permission check: subadmins can only adjust balances of assigned users
    if (adminProfile.role === 'subadmin') {
      const unauthorizedUsers = targetUsers.filter(u => u.upline_subadmin_id !== adminProfile.id);
      if (unauthorizedUsers.length > 0) {
        return NextResponse.json({ 
          error: `Forbidden: Cannot adjust ${unauthorizedUsers.length} user(s) outside your scope` 
        }, { status: 403 });
      }
    }

    // For withdrawals, check all users have sufficient balance
    if (type === 'withdrawal') {
      const insufficientUsers = targetUsers.filter(u => (u.investment_balance || 0) < amount);
      if (insufficientUsers.length > 0) {
        return NextResponse.json({ 
          error: `${insufficientUsers.length} user(s) have insufficient balance for withdrawal of $${amount.toLocaleString()}` 
        }, { status: 400 });
      }
    }

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
    const actionLabel = type === 'deposit' ? 'Manual bulk deposit' : 'Manual bulk withdrawal';
    const processedCount = targetUsers.length;
    let successCount = 0;
    const transactions = [];

    // Process each user
    for (const targetUser of targetUsers) {
      const currentInvestmentBalance = Number(targetUser.investment_balance || 0);

      let newInvestmentBalance: number;

      if (type === 'deposit') {
        newInvestmentBalance = currentInvestmentBalance + amount;
      } else {
        newInvestmentBalance = currentInvestmentBalance - amount;
      }

      // Update users table
      const { error: updateError } = await serviceClient
        .from('users')
        .update({
          investment_balance: newInvestmentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUser.id);

      if (updateError) {
        console.error(`[POST /api/admin/users/bulk-adjustment] Update failed for user ${targetUser.id}:`, updateError.message);
        continue;
      }

      // Calculate total balance for profiles table
      const earningsBalance = Number(targetUser.earnings_balance || 0);
      const bonusBalance = Number(targetUser.bonus_balance || 0);
      const newTotalBalance = newInvestmentBalance + earningsBalance + bonusBalance;

      // Sync profiles table
      const { error: profileUpdateError } = await serviceClient
        .from('profiles')
        .update({
          main_balance: newInvestmentBalance,
          balance: newTotalBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUser.id);

      if (profileUpdateError) {
        console.error(`[POST /api/admin/users/bulk-adjustment] Profiles sync warning for user ${targetUser.id}:`, profileUpdateError.message);
      }

      // Create transaction record
      const { data: transaction, error: txError } = await serviceClient
        .from('transactions')
        .insert({
          user_id: targetUser.id,
          type: type,
          amount: amount,
          asset: 'USD',
          status: 'completed',
          processed_by: adminProfile.id,
          note: notes ? `${actionLabel}: ${notes}` : `${actionLabel}`,
          created_at: txTimestamp
        })
        .select()
        .single();

      if (txError) {
        console.error(`[POST /api/admin/users/bulk-adjustment] Transaction logging failed for user ${targetUser.id}:`, txError.message);
      } else {
        transactions.push(transaction);
      }

      successCount++;
    }

    // Create audit log
    await serviceClient.from('audit_logs').insert({
      admin_id: adminProfile.id,
      action: `bulk_manual_${type}_adjustment`,
      resource_type: 'users',
      resource_id: userIds.join(','),
      before_state: { user_count: processedCount },
      after_state: { successful: successCount, amount_per_user: amount, type: type },
      metadata: {
        type: type,
        amount: amount,
        user_count: processedCount,
        successful_count: successCount,
        backdated: !!backdateDate,
        original_timestamp: new Date().toISOString()
      },
      ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
    });

    const verb = type === 'deposit' ? 'Deposited' : 'Withdrawn';
    return NextResponse.json({
      success: true,
      message: `Successfully ${verb.toLowerCase()} $${amount.toLocaleString()} ${type === 'deposit' ? 'to' : 'from'} ${successCount} user(s)`,
      summary: {
        total_users: processedCount,
        successful: successCount,
        amount_per_user: amount,
        type: type,
        total_amount: amount * successCount
      },
      transactions
    });
  } catch (error: any) {
    console.error('[POST /api/admin/users/bulk-adjustment] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
