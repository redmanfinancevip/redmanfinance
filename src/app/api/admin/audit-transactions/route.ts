import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function GET(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;
    const { searchParams } = new URL(req.url);
    
    const typeFilter = searchParams.get('type') || 'all';
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let query = serviceClient
      .from('audit_logs')
      .select(`
        id,
        action,
        resource_id,
        before_state,
        after_state,
        metadata,
        created_at,
        admin_id,
        profiles:admin_id (full_name),
        users:resource_id (full_name, email)
      `)
      .like('action', '%adjustment%');

    // Filter by type if specified
    if (typeFilter !== 'all') {
      query = query.eq('metadata->type', typeFilter);
    }

    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      query = query.lte('created_at', new Date(dateTo).toISOString());
    }

    const { data: auditLogs, error: dbError } = await query.order('created_at', { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Map and filter
    let transactions = (auditLogs || [])
      .map((log: any) => {
        const userIds = log.resource_id.split(',');
        const isMultiple = userIds.length > 1;
        const userName = isMultiple ? `${userIds.length} users` : (log.users?.full_name || 'Unknown');
        const email = isMultiple ? 'bulk-operation' : (log.users?.email || '');
        const adminName = log.profiles?.full_name || 'Unknown Admin';
        const type = log.metadata?.type || 'unknown';
        const amount = log.metadata?.amount || 0;
        const reason = log.metadata?.reason || log.action;
        const backdated = log.metadata?.backdated === true;

        return {
          id: log.id,
          user: userName,
          email: email,
          type: type,
          amount: Number(amount),
          adminName: adminName,
          reason: reason,
          timestamp: log.created_at,
          backdated: backdated,
          originalTimestamp: log.metadata?.original_timestamp
        };
      });

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(t =>
        t.user.toLowerCase().includes(searchLower) ||
        t.email.toLowerCase().includes(searchLower) ||
        t.adminName.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length
    });
  } catch (error: any) {
    console.error('[GET /api/admin/audit-transactions] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
