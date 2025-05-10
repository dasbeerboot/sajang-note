import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // The `code` is present, so a server-side type exchange is required.
    // This is usually handled by Supabase Auth Helpers when `redirectTo` is
    // the Supabase Function URL or if you manually call `exchangeCodeForSession`.
    // If the #fragment contains the session, then client-side handling is already done.
    try {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      await supabase.auth.exchangeCodeForSession(code); // This will set the session cookie
    } catch (error) {
      console.error('Error exchanging code for session in callback:', error);
      // Optionally, redirect to an error page or login page with an error message
      return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin));
    }
  }

  // URL to redirect to after sign-in completes
  // This could be the homepage or a protected route
  // If the URL has a #fragment (session info), it will be preserved
  return NextResponse.redirect(new URL('/', requestUrl.origin));
} 