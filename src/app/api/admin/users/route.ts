import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function GET(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile, serviceClient } = authResult;

    let query = serviceClient
      .from('users')
      .select('id, name, email, role, tier, kyc_status, account_status, investment_balance, earnings_balance, bonus_balance, created_at, upline_subadmin_id, upline_subadmin:users!upline_subadmin_id(name)');

    // Scope check: subadmins can only see users assigned to them
    if (profile.role === 'subadmin') {
      query = query.eq('upline_subadmin_id', profile.id);
    } else {
      // super_admin sees all users (but usually we exclude super_admins or list everything except the caller)
      query = query.neq('role', 'super_admin');
    }

    const { data: users, error: dbError } = await query.order('created_at', { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Map database columns to the UI expectations
    const mappedUsers = (users || []).map((u: any) => {
      // Map tier to Roman numerals grade
      const tierMap: Record<string, string> = {
        'tier_1': 'I',
        'tier_2': 'II',
        'tier_3': 'III',
        'tier_4': 'IV'
      };
      
      const gradeVal = tierMap[u.tier] || 'I';
      
      // Calculate total balance = investment_balance + earnings_balance + bonus_balance
      const balance = Number(u.investment_balance || 0) + Number(u.earnings_balance || 0) + Number(u.bonus_balance || 0);

      // Handle upline subadmin name lookup (whether it's an object or an array)
      const subadminObj = Array.isArray(u.upline_subadmin) ? u.upline_subadmin[0] : u.upline_subadmin;
      const subadminName = subadminObj?.name || 'None';

      return {
        id: u.id,
        name: u.name || 'Investor',
        email: u.email,
        role: u.role || 'user',
      tier: u.tier || 'tier_1',
      grade: gradeVal,
      kycStatus: u.kyc_status || 'pending',
      status: u.account_status || 'active',
      totalDeposited: Number(u.investment_balance || 0), // investment_balance represents main deposit balance
      balance: balance,
      riskScore: 0, // risk_score does not exist in the database
      subadmin: subadminName,
      joined: u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : 'None'
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error: any) {
    console.error('[GET /api/admin/users] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Support admin actions on users via POST with action field
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;
    const body = await req.json();
    const action = body?.action;

    if (action === 'update-tier') {
      const { userIds, tier } = body;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !tier) {
        return NextResponse.json({ error: 'Invalid payload: userIds (array) and tier are required' }, { status: 400 });
      }

      // Subadmins limited to their assigned users
      const { data: targetUsers, error: fetchError } = await serviceClient
        .from('users')
        .select('id, upline_subadmin_id, tier')
        .in('id', userIds);

      if (fetchError || !targetUsers || targetUsers.length === 0) {
        return NextResponse.json({ error: 'No target users found' }, { status: 404 });
      }

      if (adminProfile.role === 'subadmin') {
        const unauthorized = targetUsers.filter((u: any) => u.upline_subadmin_id !== adminProfile.id);
        if (unauthorized.length > 0) {
          return NextResponse.json({ error: 'Forbidden: cannot update tier for users not assigned to you' }, { status: 403 });
        }
      }

      const results: any[] = [];
      for (const tu of targetUsers) {
        const { error: updateError } = await serviceClient
          .from('users')
          .update({ tier })
          .eq('id', tu.id);

        if (updateError) results.push({ id: tu.id, success: false, error: updateError.message });
        else results.push({ id: tu.id, success: true });

        // Audit log
        await serviceClient.from('audit_logs').insert({
          admin_id: adminProfile.id,
          action: `tier_updated_to_${tier}`,
          resource_type: 'user',
          resource_id: tu.id,
          before_state: { tier: tu.tier },
          after_state: { tier },
          ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
        });
      }

      return NextResponse.json({ success: true, results });
    }

    if (action === 'update-payment') {
      const { userIds, payment_method, payment_address, payment_qr_url } = body;
      if (!payment_method || !payment_address) {
        return NextResponse.json({ error: 'Invalid payload: payment_method and payment_address are required' }, { status: 400 });
      }

      // If no userIds provided, update all non-admin users
      const query = userIds && Array.isArray(userIds) && userIds.length > 0
        ? serviceClient.from('users').update({ payment_method, payment_address, payment_qr_url }).in('id', userIds)
        : serviceClient.from('users').update({ payment_method, payment_address, payment_qr_url }).neq('role', 'super_admin');

      const { error: updateError } = await query;
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      // Log audit
      await serviceClient.from('audit_logs').insert({
        admin_id: adminProfile.id,
        action: 'bulk_update_payment_info',
        resource_type: 'users',
        resource_id: userIds && userIds.length ? userIds.join(',') : 'all_non_admins',
        metadata: { payment_method, payment_address, payment_qr_url },
        ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
      });

      return NextResponse.json({ success: true, message: 'Payment information updated' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[POST /api/admin/users] Runtime error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
