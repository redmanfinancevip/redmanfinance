import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function GET(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;
    const isSubadmin = adminProfile.role === 'subadmin';

    // 1. Core aggregates
    // Base user query
    let userQuery = serviceClient.from('users').select('investment_balance, earnings_balance, bonus_balance, account_status, created_at', { count: 'exact' });
    if (isSubadmin) {
      userQuery = userQuery.eq('upline_subadmin_id', adminProfile.id);
    } else {
      userQuery = userQuery.neq('role', 'super_admin');
    }

    const { data: users, count: userCount, error: userError } = await userQuery;
    if (userError) throw userError;

    let activeUsers = 0;
    let flaggedUsers = 0;
    let newSignups = 0;
    let totalAUM = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (users) {
      users.forEach((u: any) => {
        const uBal = Number(u.investment_balance || 0) + Number(u.earnings_balance || 0) + Number(u.bonus_balance || 0);
        totalAUM += uBal;

        if (u.account_status === 'active') activeUsers++;
        if (u.account_status === 'flagged') flaggedUsers++;
        
        if (u.created_at && new Date(u.created_at) >= thirtyDaysAgo) {
          newSignups++;
        }
      });
    }

    // 2. Pending Approvals Count & Transactions list
    // 2. Pending Approvals Count & Transactions list
    let pendingTxQuery = serviceClient.from('transactions').select('id, user_id, type, amount, asset, created_at, status, profiles!inner(full_name, email, assigned_subadmin_id, grade)', { count: 'exact' });
    
    if (isSubadmin) {
      pendingTxQuery = pendingTxQuery
        .eq('status', 'pending')
        .eq('profiles.assigned_subadmin_id', adminProfile.id)
        .lt('amount', 10000); // subadmin only views under 10k
    } else {
      pendingTxQuery = pendingTxQuery.eq('status', 'pending');
    }

    const { data: pendingTxs, count: pendingCount, error: pendingError } = await pendingTxQuery.order('created_at', { ascending: false });
    if (pendingError) throw pendingError;

    // 3. Today's Accrued Earnings (sum of payouts credited today)
    const todayStr = new Date().toISOString().split('T')[0];
    let earningsQuery = serviceClient.from('transactions').select('amount, profiles!inner(assigned_subadmin_id)');
    
    if (isSubadmin) {
      earningsQuery = earningsQuery
        .eq('type', 'earnings')
        .eq('status', 'completed')
        .gte('created_at', todayStr)
        .eq('profiles.assigned_subadmin_id', adminProfile.id);
    } else {
      earningsQuery = earningsQuery
        .eq('type', 'earnings')
        .eq('status', 'completed')
        .gte('created_at', todayStr);
    }

    const { data: todayEarningsData, error: earningsError } = await earningsQuery;
    if (earningsError) throw earningsError;
    const todayEarnings = (todayEarningsData || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    // 4. Vault Balance
    let vaultQuery = serviceClient.from('subadmin_vaults').select('balance');
    if (isSubadmin) {
      vaultQuery = vaultQuery.eq('subadmin_id', adminProfile.id);
    }

    const { data: vaultData, error: vaultError } = await vaultQuery;
    if (vaultError) throw vaultError;
    const vaultBalance = (vaultData || []).reduce((sum, v) => sum + Number(v.balance || 0), 0);

    // 5. Total Transactions count
    let totalTxCountQuery = serviceClient.from('transactions').select('id, profiles!inner(assigned_subadmin_id)', { count: 'exact', head: true });
    if (isSubadmin) {
      totalTxCountQuery = totalTxCountQuery.eq('profiles.assigned_subadmin_id', adminProfile.id);
    }
    const { count: totalTransactions, error: totalTxError } = await totalTxCountQuery;
    if (totalTxError) throw totalTxError;

    // 6. Map pending transactions for UI
    const mappedPendingTxs = (pendingTxs || []).map((tx: any) => {
      const risk = Number(tx.amount) >= 10000 ? 'high' : Number(tx.amount) >= 3000 ? 'medium' : 'low';
      const profile = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles;
      const gradeMap: Record<string, string> = { 'tier_1': 'I', 'tier_2': 'II', 'tier_3': 'III', 'tier_4': 'IV' };
      const gradeVal = gradeMap[profile?.grade] || profile?.grade || 'I';
      
      return {
        id: tx.id,
        user: profile?.full_name || 'Investor',
        email: profile?.email || '',
        type: tx.type,
        amount: Number(tx.amount),
        asset: tx.asset || 'USD',
        submitted: tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Unknown',
        risk: risk,
        grade: gradeVal
      };
    });

    // 7. Activity feed (recent approved, rejected, signup, kyc events)
    let activityQuery = serviceClient.from('transactions')
      .select('id, type, amount, created_at, status, profiles!inner(full_name, assigned_subadmin_id)')
      .neq('status', 'pending')
      .limit(8)
      .order('created_at', { ascending: false });

    if (isSubadmin) {
      activityQuery = activityQuery.eq('profiles.assigned_subadmin_id', adminProfile.id);
    }

    const { data: recentActivities, error: activityError } = await activityQuery;
    if (activityError) throw activityError;

    const mappedActivityFeed = (recentActivities || []).map((act: any) => {
      let event = 'Transaction processed';
      let type = 'approval';

      if (act.status === 'completed' || act.status === 'approved') {
        event = act.type === 'deposit' ? 'New deposit confirmed' : 'Withdrawal approved';
        type = act.type === 'deposit' ? 'deposit' : 'approval';
      } else if (act.status === 'rejected') {
        event = act.type === 'deposit' ? 'Deposit rejected' : 'Withdrawal rejected';
        type = 'flag';
      }

      // Calculate time string relative
      const diffMs = new Date().getTime() - new Date(act.created_at).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const timeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins} min ago` : `${Math.floor(diffMins/60)}h ago`;
      const profile = Array.isArray(act.profiles) ? act.profiles[0] : act.profiles;

      return {
        id: act.id,
        event: event,
        user: profile?.full_name || 'Investor',
        amount: act.amount ? `$${Number(act.amount).toLocaleString()}` : '—',
        time: timeStr,
        type: type
      };
    });

    // If activity feed is too short, seed some default/placeholder rows dynamically
    if (mappedActivityFeed.length === 0) {
      mappedActivityFeed.push({
        id: 'feed-seed-1',
        event: 'System active & connected',
        user: 'System',
        amount: '—',
        time: 'Just now',
        type: 'earnings'
      });
    }

    return NextResponse.json({
      stats: {
        totalAUM,
        pendingApprovals: pendingCount || 0,
        todayEarnings,
        activeUsers,
        vaultBalance,
        newSignups,
        totalTransactions: totalTransactions || 0,
        flaggedUsers
      },
      pendingTransactions: mappedPendingTxs,
      activityFeed: mappedActivityFeed
    });

  } catch (error: any) {
    console.error('[GET /api/admin/stats] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
