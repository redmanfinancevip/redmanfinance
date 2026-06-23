import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function POST(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;

    // Only super_admin is allowed to create subadmin accounts
    if (adminProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Only Super Admins can create subadmins' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Invalid payload: name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // 1. Create the user in Supabase Auth schema using the Admin API
    const { data: authUser, error: signUpError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'subadmin',
        full_name: name
      }
    });

    if (signUpError || !authUser.user) {
      return NextResponse.json({
        error: `Auth account creation failed: ${signUpError?.message || 'Unknown error'}`
      }, { status: 500 });
    }

    const newUserId = authUser.user.id;

    // 2. Create the profile in the public 'users' table
    const { error: profileError } = await serviceClient
      .from('users')
      .insert({
        id: newUserId,
        email,
        name,
        role: 'subadmin',
        account_status: 'active',
        email_verified: true,
        tier: 'tier_1',
        grade: 1
      });

    if (profileError) {
      console.error('[POST /api/admin/subadmin/create] Profile table insert failed:', profileError.message);
      // Clean up the created auth user to avoid dangling auth records on failure
      await serviceClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({
        error: `Database profile creation failed: ${profileError.message}`
      }, { status: 500 });
    }

    // 2b. Also create the subadmin profile record in the 'profiles' table
    const { error: profileTableError } = await serviceClient
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name: name,
        role: 'subadmin',
        status: 'active',
        kyc_status: 'not_submitted',
        grade: 'tier_1',
        balance: 0,
        main_balance: 0,
        earnings_balance: 0,
        bonus_balance: 0
      });

    if (profileTableError) {
      console.error('[POST /api/admin/subadmin/create] Profiles table insert failed:', profileTableError.message);
      // Clean up the users record and auth user
      await serviceClient.from('users').delete().eq('id', newUserId);
      await serviceClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({
        error: `Database profiles table creation failed: ${profileTableError.message}`
      }, { status: 500 });
    }

    // 3. Insert audit log
    await serviceClient.from('audit_logs').insert({
      admin_id: adminProfile.id,
      action: 'create_subadmin',
      resource_type: 'user',
      resource_id: newUserId,
      after_state: { email, name, role: 'subadmin', account_status: 'active' },
      ip_address: req.headers.get('x-forwarded-for') || 'Unknown'
    });

    return NextResponse.json({
      success: true,
      message: `Subadmin account successfully created for ${name}.`,
      subadmin: {
        id: newUserId,
        name,
        email,
        role: 'subadmin'
      }
    });
  } catch (error: any) {
    console.error('[POST /api/admin/subadmin/create] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
