import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return cookieStore.get(name)?.value;
          },
          async set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          async remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options }); // To remove, set an empty value and options
          },
        },
      }
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error(
          '[AUTH_CALLBACK_ERROR] Error exchanging code for session:',
          error.message,
          error
        );
        return NextResponse.redirect(
          new URL(
            '/?error=auth_callback_failed&message=' + encodeURIComponent(error.message),
            requestUrl.origin
          )
        );
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(
        '[AUTH_CALLBACK_CRITICAL_ERROR] Exception during code exchange:',
        errorMessage,
        e
      );
      return NextResponse.redirect(
        new URL(
          '/?error=auth_callback_exception&message=' + encodeURIComponent(errorMessage),
          requestUrl.origin
        )
      );
    }
  } else {
    console.warn('[AUTH_CALLBACK_WARN] No code found in callback request.');
    return NextResponse.redirect(new URL('/?error=auth_callback_no_code', requestUrl.origin));
  }

  console.log(
    '[AUTH_CALLBACK_SUCCESS] Successfully exchanged code for session. Redirecting to home.'
  );
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
