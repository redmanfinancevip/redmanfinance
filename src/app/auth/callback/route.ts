import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');

  if (code) {
    // 🚀 Next.js 15 Fix: cookies() is now an async function
    const cookieStore = await cookies();
    
    // 🌐 Network Security Check: Disable secure cookies on plain http local networks
    // We check protocol and ensure local IP addresses like 192.168.x.x don't attempt to use Secure cookies
    const isSecureContext = 
      requestUrl.protocol === 'https:' && 
      !requestUrl.hostname.startsWith('192.168.');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ 
              name, 
              value, 
              ...options,
              secure: isSecureContext // 👈 Dynamically overrides strict HTTPS rules locally
            });
          },
          remove(name: string, options: any) {
            cookieStore.set({ 
              name, 
              value: '', 
              ...options,
              secure: isSecureContext 
            });
          },
        },
      }
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error && data?.session) {
        if (type === 'signup' || type === 'invite') {
          return NextResponse.redirect(`${requestUrl.origin}/verify-email`);
        }
        return NextResponse.redirect(`${requestUrl.origin}/update-password`);
      } else {
        console.error('Handshake failed:', error?.message);
      }
    } catch (err) {
      console.error('Runtime callback failure:', err);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/sign-up-login-screen`);
}