import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Standard client-side Supabase client utility.
 * Includes error handling and development mode configuration
 */
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-auth-token',
      flowType: 'pkce',
    },
    db: {
      schema: 'public',
    },
    global: {
      fetch: (input: URL | RequestInfo, init?: RequestInit) => {
        // Handle fetch with proper timeout and error handling
        if (init) {
          (init as any).timeout = 30000;
        }
        return fetch(input, init);
      },
      headers: {
        'X-Client-Info': 'supabase-js/' + process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
    },
  });
};