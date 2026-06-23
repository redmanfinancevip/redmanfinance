import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // 🚀 THE FIX: Tell Supabase to use standard browser localStorage instead of cookies.
        // This stops Rocket.new from blocking or dropping our session tokens!
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'redman-finance-auth-token',
      }
    });
  }
  return supabaseInstance;
};