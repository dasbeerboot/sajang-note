import { createClient } from '@supabase/supabase-js';

/**
 * 요청으로부터 현재 인증된 사용자 정보를 가져옵니다.
 */
export async function getUserFromRequest(request: Request) {
  try {
    // 서버 측에서 쿠키를 직접 가져와 Supabase 클라이언트 생성
    const cookieString = (await request.headers.get('cookie')) || '';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 서비스 롤 키 사용

    // 쿠키로부터 auth 정보 추출
    let authToken = '';
    const cookiePairs = cookieString.split(';');
    for (const cookie of cookiePairs) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'sb-access-token') {
        authToken = value;
        break;
      }
    }

    if (!authToken) {
      console.log('[auth-utils] 인증 토큰을 찾을 수 없습니다');
      return null;
    }

    // 서비스 롤 키로 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 토큰을 사용해 사용자 정보 가져오기
    const { data, error } = await supabase.auth.getUser(authToken);

    if (error) {
      console.error('[auth-utils] 사용자 정보 가져오기 오류:', error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('[auth-utils] 사용자 인증 정보 추출 중 오류:', error);
    return null;
  }
}
