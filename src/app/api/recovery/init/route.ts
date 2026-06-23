import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.asset || body.sourceAddress === undefined) {
      return NextResponse.json({ error: 'Missing required fields: asset, sourceAddress' }, { status: 400 });
    }

    // Map case types to valid recovery_type enum
    const caseTypeMap: Record<string, string> = {
      'credential_loss': 'credential_loss',
      'malicious_interception': 'malicious_interception',
      'stuck_contract': 'stuck_contract'
    };
    
    // Default to credential_loss if not specified or invalid
    let recoveryType = body.caseType && caseTypeMap[body.caseType] 
      ? caseTypeMap[body.caseType]
      : 'credential_loss';

    const payload = {
      user_id: user.id,
      recovery_type: recoveryType,
      asset_ticker: body.asset,
      inputted_balance: body.inputtedBalance ? parseFloat(body.inputtedBalance) : 0,
      discovered_balance: body.discovered_balance ? parseFloat(body.discovered_balance) : null,
      source_address: body.sourceAddress || '',
      destination_address: body.destinationAddress || null,
      paper_key_phrase: body.paperKeyPhrase || null,
      status: 'kyc_pending'
    };

    const { data, error } = await supabaseServer
      .from('asset_recoveries')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create recovery session' }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id, success: true });
  } catch (e) {
    console.error('Recovery init route error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
