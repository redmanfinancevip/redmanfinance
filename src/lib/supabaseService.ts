import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client powered by the service role key.
 * This client bypasses RLS and has full administrative permissions.
 * MUST only be used server-side in API routes.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase Service Role configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Verifies that the caller is authenticated and has administrative permissions (super_admin or subadmin).
 * Reads the session token from the Authorization header.
 */
export async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: 'Unauthorized: Missing Authorization header', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { error: 'Unauthorized: Missing token in Authorization header', status: 401 };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Verify token validity by requesting the user profile with the token client
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) {
    return { error: `Unauthorized: Invalid token - ${authError?.message || 'User not found'}`, status: 401 };
  }

  // Fetch the user's role from the users table using service role client
  const serviceClient = createServiceRoleClient();
  const { data: profile, error: profileError } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Forbidden: Admin user record not found in database', status: 403 };
  }

  if (profile.role !== 'super_admin' && profile.role !== 'subadmin') {
    return { error: 'Forbidden: Administrative permissions required', status: 403 };
  }

  return { user, profile, serviceClient };
}
