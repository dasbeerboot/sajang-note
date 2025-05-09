import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  console.log('Auth 콜백 수신:', { code: code?.substring(0, 10) + '...', error, error_description });
  
  if (error) {
    console.error('Auth 오류:', error, error_description);
    // 에러 페이지로 리디렉션
    return NextResponse.redirect(new URL(`/?auth_error=${error}`, requestUrl.origin));
  }

  if (code) {
    try {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('세션 교환 오류:', sessionError);
        return NextResponse.redirect(new URL(`/?auth_error=${sessionError.message}`, requestUrl.origin));
      }
      
      console.log('세션 교환 성공');
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    } catch (err) {
      console.error('콜백 처리 중 오류 발생:', err);
      return NextResponse.redirect(new URL('/?auth_error=callback_error', requestUrl.origin));
    }
  }

  // 코드가 없는 경우 홈으로 리디렉션
  return NextResponse.redirect(new URL('/?auth_error=no_code', requestUrl.origin));
} 