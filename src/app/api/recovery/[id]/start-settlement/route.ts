import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest, context: any) {
  try {
    const params = await context.params;
    const id = params?.id as string;
    const { data, error } = await supabaseServer
      .from('asset_recoveries')
      .update({ settlement_timer_started: 'now()', status: 'settlement_countdown' })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
