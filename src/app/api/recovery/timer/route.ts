import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data, error } = await supabaseServer
      .from('asset_recoveries')
      .select('settlement_timer_started, created_at')
      .eq('id', id)
      .limit(1)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const started = data.settlement_timer_started || data.created_at;
    if (!started) return NextResponse.json({ remaining_seconds: null });

    const start = new Date(started).getTime();
    const end = start + 48 * 3600 * 1000; // 48 hours
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));

    return NextResponse.json({ remaining_seconds: remaining });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
