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

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';
    const typeFilter = searchParams.get('type') || 'all';
    const search = searchParams.get('search') || '';

    let query = serviceClient
      .from('transactions')
      .select('id, user_id, type, amount, asset, status, processed_by, created_at, tx_hash, note, rejection_reason, profiles!inner(full_name, email, assigned_subadmin_id, grade)');

    // Scope check: subadmins can only see transactions of assigned users
    if (isSubadmin) {
      query = query.eq('profiles.assigned_subadmin_id', adminProfile.id);
    }

    // Apply filters
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    const { data: transactions, error: dbError } = await query.order('created_at', { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Map database columns to the UI expectations
    let mappedTxs = (transactions || []).map((t: any) => {
      const risk = Number(t.amount) >= 10000 ? 'high' : Number(t.amount) >= 3000 ? 'medium' : 'low';
      const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
      
      const gradeMap: Record<string, string> = { 'tier_1': 'I', 'tier_2': 'II', 'tier_3': 'III', 'tier_4': 'IV' };
      const gradeVal = gradeMap[profile?.grade] || profile?.grade || 'I';

      return {
        id: t.id,
        user: profile?.full_name || 'Investor',
        email: profile?.email || '',
        type: t.type,
        amount: Number(t.amount),
        asset: t.asset || 'USD',
        status: t.status || 'pending',
        grade: gradeVal,
        risk: risk,
        subadmin: 'None', // Will resolve subadmin name below if needed
        upline_subadmin_id: profile?.assigned_subadmin_id,
        date: t.created_at ? new Date(t.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'None',
        note: t.rejection_reason || t.note || (Number(t.amount) >= 10000 ? 'Escalated to Super Admin review' : '')
      };
    });

    // Optionally filter by search text in user name or transaction ID
    if (search.trim() !== '') {
      const lowerSearch = search.toLowerCase();
      mappedTxs = mappedTxs.filter(
        (t) =>
          t.user.toLowerCase().includes(lowerSearch) ||
          t.email.toLowerCase().includes(lowerSearch) ||
          t.id.toLowerCase().includes(lowerSearch)
      );
    }

    // Resolve subadmin names if needed
    const subadminIds = Array.from(new Set(mappedTxs.map(t => t.upline_subadmin_id).filter(Boolean)));
    if (subadminIds.length > 0) {
      const { data: subadmins } = await serviceClient
        .from('users')
        .select('id, name')
        .in('id', subadminIds);
      
      if (subadmins) {
        const subadminMap = new Map(subadmins.map(s => [s.id, s.name]));
        mappedTxs.forEach(t => {
          if (t.upline_subadmin_id) {
            t.subadmin = subadminMap.get(t.upline_subadmin_id) || 'None';
          }
        });
      }
    }

    return NextResponse.json({ transactions: mappedTxs });
  } catch (error: any) {
    console.error('[GET /api/admin/transactions] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
