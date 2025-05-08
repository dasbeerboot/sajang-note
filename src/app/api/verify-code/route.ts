import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const requestData = await request.json();
    const { phone, code, isSignup = false } = requestData;
    
    if (!phone || !code) {
      return NextResponse.json({ error: '전화번호와 인증번호를 모두 입력해주세요.' }, { status: 400 });
    }
    
    // 쿠키 스토어 가져오기
    const cookieStore = cookies();
    
    // Supabase 클라이언트 생성
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // 비동기 처리 없이 직접 값을 반환
            const cookie = cookieStore.get(name);
            return cookie?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    
    // 회원가입이 아닌 경우에만 인증 확인
    let userId = null;
    if (!isSignup) {
      // 현재 로그인한 사용자 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
      }
      userId = session.user.id;
    }
    
    // 유효한 인증번호 조회
    const now = new Date().toISOString();
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (verificationError || !verificationData) {
      return NextResponse.json({ error: '유효하지 않거나 만료된 인증번호입니다.' }, { status: 400 });
    }
    
    // 인증번호 사용 처리
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id);
    
    // 회원가입이 아닌 경우에만 사용자 프로필 업데이트
    if (!isSignup && userId) {
      // 사용자 프로필에 전화번호 정보 업데이트
      // 실제 phone_verified는 프로필 설정 완료 시 업데이트
      await supabase
        .from('profiles')
        .update({ 
          phone: phone,
          updated_at: now
        })
        .eq('id', userId);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('인증번호 확인 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 