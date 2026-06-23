import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function GET(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;

    if (adminProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    // Fetch audit logs with the actor user details
    const { data: dbLogs, error: dbError } = await serviceClient
      .from('audit_logs')
      .select('id, action, resource_type, resource_id, ip_address, created_at, before_state, after_state, users:admin_id(name)')
      .order('created_at', { ascending: false })
      .limit(100); // capped at 100 recent actions for performant rendering

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const mappedLogs = (dbLogs || []).map((l: any) => {
      // Map database action names to user-friendly events
      const eventMap: Record<string, string> = {
        transaction_approved: 'transaction.approved',
        transaction_rejected: 'transaction.rejected',
        user_active: 'user.activated',
        user_locked: 'user.locked',
        user_flagged: 'user.flagged',
        vault_refill: 'vault.refill',
        wallet_added: 'settings.wallet_added',
        manual_deposit_injection: 'vault.disburse'
      };

      // Extract amount information if present in the states
      let amountStr = '—';
      if (l.before_state && l.after_state) {
        const amt = l.after_state.amount || l.after_state.balance;
        if (amt !== undefined) amountStr = `$${Number(amt).toLocaleString()}`;
      } else if (l.after_state?.amount) {
        amountStr = `$${Number(l.after_state.amount).toLocaleString()}`;
      }

      return {
        id: l.id,
        event: eventMap[l.action] || l.action || 'system.event',
        actor: l.users?.name || 'System / Admin',
        target: `${l.resource_type || 'system'} ID: ${l.resource_id ? l.resource_id.slice(0,8) : 'general'}`,
        amount: amountStr,
        ip: l.ip_address || '127.0.0.1',
        eventTime: l.created_at ? new Date(l.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : 'Unknown',
        category: l.resource_type || 'system'
      };
    });

    return NextResponse.json({ auditLogs: mappedLogs });

  } catch (error: any) {
    console.error('[GET /api/admin/audit] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
