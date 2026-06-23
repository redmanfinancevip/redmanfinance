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
    const { userIds, status, flagReason } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !status) {
      return NextResponse.json({ error: 'Invalid payload: userIds (array) and status are required' }, { status: 400 });
    }

    const allowedStatuses = ['active', 'locked', 'flagged'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
    }

    // 1. Fetch target profiles to verify permissions
    const { data: targetUsers, error: fetchError } = await serviceClient
      .from('users')
      .select('id, name, email, account_status, upline_subadmin_id')
      .in('id', userIds);

    if (fetchError || !targetUsers || targetUsers.length === 0) {
      return NextResponse.json({ error: 'No target users found' }, { status: 404 });
    }

    // Subadmins can only update users assigned to them
    if (adminProfile.role === 'subadmin') {
      const unauthorizedUsers = targetUsers.filter(u => u.upline_subadmin_id !== adminProfile.id);
      if (unauthorizedUsers.length > 0) {
        return NextResponse.json({
          error: 'Forbidden: You can only update statuses of users assigned to you'
        }, { status: 403 });
      }
    }

    // 2. Perform updates and audit logs
    const results = [];
    for (const targetUser of targetUsers) {
      const { error: updateError } = await serviceClient
        .from('users')
        .update({
          account_status: status,
          flag_reason: flagReason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUser.id);

      if (updateError) {
        results.push({ id: targetUser.id, success: false, error: updateError.message });
      } else {
        // Sync account status to the profiles table
        const { error: profileUpdateError } = await serviceClient
          .from('profiles')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUser.id);

        if (profileUpdateError) {
          console.error(`[POST /api/admin/users/update-status] Profiles sync warning for user ${targetUser.id}:`, profileUpdateError.message);
        }

        results.push({ id: targetUser.id, success: true });

        // Log audit trail
        await serviceClient.from('audit_logs').insert({
          admin_id: adminProfile.id,
          action: `user_${status}`,
          resource_type: 'user',
          resource_id: targetUser.id,
          before_state: { account_status: targetUser.account_status },
          after_state: { account_status: status, flag_reason: flagReason || null },
          ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
        });
      }
    }

    const failedCount = results.filter(r => !r.success).length;
    if (failedCount === userIds.length) {
      return NextResponse.json({ error: 'All user status updates failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated status of ${userIds.length - failedCount} user(s) to '${status}'.`,
      results
    });
  } catch (error: any) {
    console.error('[POST /api/admin/users/update-status] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
