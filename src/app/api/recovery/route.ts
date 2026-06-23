import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === 'claim') {
      const id = body?.id;
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

      const { data, error } = await supabaseServer
        .from('asset_recoveries')
        .select('id, status, recovered_amount, user_id')
        .eq('id', id)
        .single();

      if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (data.status === 'completed') {
        return NextResponse.json({ error: 'Recovery already claimed' }, { status: 400 });
      }

      if (data.status !== 'approved' && data.status !== 'settlement_countdown') {
        return NextResponse.json({ error: 'Recovery not approved for claim' }, { status: 400 });
      }

      // Transfer recovered funds to user's main balance
      if (data.recovered_amount && data.recovered_amount > 0) {
        try {
          // Get current user balance
          const { data: userData, error: userErr } = await supabaseServer
            .from('users')
            .select('main_balance')
            .eq('id', data.user_id)
            .single();

          if (userErr) {
            console.error('Failed to fetch user balance:', userErr);
            return NextResponse.json({ error: 'Failed to transfer funds: user balance not found' }, { status: 500 });
          }

          const currentBalance = userData?.main_balance || 0;
          const newBalance = currentBalance + data.recovered_amount;

          // Update user's main balance
          const { error: balanceErr } = await supabaseServer
            .from('users')
            .update({ main_balance: newBalance })
            .eq('id', data.user_id);

          if (balanceErr) {
            console.error('Failed to update user balance:', balanceErr);
            return NextResponse.json({ error: 'Failed to transfer funds to main balance' }, { status: 500 });
          }
        } catch (transferErr) {
          console.error('Error during balance transfer:', transferErr);
          return NextResponse.json({ error: 'Fund transfer failed' }, { status: 500 });
        }
      }

      // Mark recovery as completed
      const { data: completedRecovery, error: claimErr } = await supabaseServer
        .from('asset_recoveries')
        .update({ status: 'completed' })
        .eq('id', id)
        .select()
        .single();

      if (claimErr) return NextResponse.json({ error: claimErr.message || claimErr }, { status: 500 });

      // Notify user via notifications table
      try {
        if (completedRecovery?.user_id) {
          await supabaseServer.from('notifications').insert({
            user_id: completedRecovery.user_id,
            category: 'system',
            title: 'Recovery Claimed Successfully',
            message: `Your recovered funds ($${completedRecovery.recovered_amount}) have been deposited to your main account balance.`,
            metadata: { recovery_id: id, recovered_amount: completedRecovery.recovered_amount },
          });
        }
      } catch (e) {
        console.warn('Failed to insert notification (non-fatal):', e);
      }

      return NextResponse.json({ ok: true, claimed: completedRecovery });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('recovery route POST error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
