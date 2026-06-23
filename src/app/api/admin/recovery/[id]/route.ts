import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest, context: any) {
  try {
    const params = await context.params;
    const id = params?.id as string;
    const { data, error } = await supabaseServer
      .from('asset_recoveries')
      .select('*')
      .eq('id', id)
      .limit(1)
      .single();
    if (error) {
      const msg = typeof error === 'object' ? (error.message || JSON.stringify(error)) : String(error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: any) {
  try {
    const params = await context.params;
    const id = params?.id as string;
    const body = await req.json();
    const update = {} as any;
    if (body.status) {
      // Map high-level admin actions to internal lifecycle statuses allowed by the DB
      if (body.status === 'approved') {
        update.status = 'settlement_countdown';
      } else if (body.status === 'denied') {
        update.status = 'audit_block';
      } else {
        update.status = body.status;
      }
    }
    if (typeof body.is_locked === 'boolean') update.is_locked = body.is_locked;
    if (body.discovered_balance !== undefined) update.discovered_balance = body.discovered_balance;
    if (body.recovered_amount !== undefined) update.recovered_amount = body.recovered_amount;
    if (body.admin_note !== undefined) update.admin_note = body.admin_note;

    const { data, error } = await supabaseServer
      .from('asset_recoveries')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const msg = typeof error === 'object' ? (error.message || JSON.stringify(error)) : String(error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // When approved or denied, create a notification for the user
    try {
        // If admin intended an approve/deny action, create a user notification
        if (body.status === 'approved' || body.status === 'denied') {
        const wasApproved = body.status === 'approved';
        const notifTitle = wasApproved ? 'Asset recovery approved' : 'Asset recovery denied';
        const notifMsg = wasApproved
          ? `Your recovery request has been approved. Approved amount: $${update.recovered_amount || data.discovered_balance}. ${body.admin_note || ''}`
          : `Your recovery request has been denied. Reason: ${body.admin_note || 'Not provided'}`;

        const notif = {
          user_id: data.user_id,
          type: wasApproved ? 'recovery_approved' : 'recovery_denied',
          title: notifTitle,
          message: notifMsg,
          metadata: {
            recovered_amount: update.recovered_amount || null,
            recovery_id: data.id,
            admin_note: body.admin_note || null
          },
          created_at: new Date().toISOString(),
          read: false
        };
        await supabaseServer.from('notifications').insert(notif);
      }
    } catch (nerr) {
      console.error('Failed to insert notification after review:', nerr);
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    const params = await context.params;
    const id = params?.id as string;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'lock') {
      const { data, error } = await supabaseServer
        .from('asset_recoveries')
        .update({ is_locked: true })
        .eq('id', id)
        .select()
        .single();
      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'complete') {
      // mark as completed and (mock) trigger disbursal
      const { data, error } = await supabaseServer
        .from('asset_recoveries')
        .update({ status: 'completed' })
        .eq('id', id)
        .select()
        .single();
      if (error) return NextResponse.json({ error }, { status: 500 });
      // TODO: integrate ledger transfer logic here
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
