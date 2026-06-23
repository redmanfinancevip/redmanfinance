import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyAdmin } from '@/lib/supabaseService';

export async function GET(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { serviceClient } = authResult;

    const { data: recoveries, error: dbError } = await serviceClient
      .from('asset_recoveries')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Fetch user details for each recovery
    const recoveriesWithUsers = await Promise.all(
      (recoveries || []).map(async (recovery) => {
        const { data: user } = await serviceClient
          .from('users')
          .select('id, name, email')
          .eq('id', recovery.user_id)
          .single();
        return { ...recovery, user };
      })
    );

    return NextResponse.json({ recoveries: recoveriesWithUsers });
  } catch (error: any) {
    console.error('[GET /api/admin/recovery] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
