import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 임시로 SMS API 대신 인증번호를 생성하고 저장만 하는 함수
async function sendSMS(phone: string, code: string): Promise<boolean> {
  console.log(`SMS 발송 (개발용): ${phone}로 인증번호 ${code} 발송`);
  // 실제 환경에서는 여기에 SMS API 호출 코드 추가
  // 예: SENS, Twilio 등의 API 호출
  return true;
}

// 6자리 랜덤 인증번호 생성
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    // 타입 단언을 사용하여 타입 오류 해결
    const cookieStore = cookies() as any;
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    
    // 현재 로그인한 사용자 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const { phone } = await request.json();
    
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: '유효한 전화번호를 입력해주세요.' }, { status: 400 });
    }
    
    // 전화번호 형식 검증
    const phoneRegex = /^01([0|1|6|7|8|9])([0-9]{3,4})([0-9]{4})$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: '유효한 전화번호 형식이 아닙니다.' }, { status: 400 });
    }
    
    // 이미 인증된 전화번호인지 확인
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('phone, phone_verified')
      .eq('phone', phone)
      .eq('phone_verified', true)
      .neq('id', session.user.id)
      .maybeSingle();
    
    if (existingProfile) {
      return NextResponse.json({ error: '이미 사용 중인 전화번호입니다.' }, { status: 400 });
    }
    
    // 3분 내에 발송 요청이 3회 이상인지 확인
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const { data: recentCodes, error: countError } = await supabase
      .from('verification_codes')
      .select('id')
      .eq('phone', phone)
      .gte('created_at', threeMinutesAgo);
    
    if (countError) {
      console.error('인증번호 조회 오류:', countError);
      return NextResponse.json({ error: '인증번호 발송 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (recentCodes && recentCodes.length >= 3) {
      return NextResponse.json({ error: '너무 많은 인증번호 요청이 있었습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    
    // 인증번호 생성
    const code = generateVerificationCode();
    
    // 인증번호 유효시간 설정 (3분)
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    
    // 기존 인증번호 만료 처리
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('phone', phone)
      .eq('used', false);
    
    // 새 인증번호 저장
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        phone,
        code,
        expires_at: expiresAt,
        used: false
      });
    
    if (insertError) {
      console.error('인증번호 저장 오류:', insertError);
      return NextResponse.json({ error: '인증번호 발송 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // SMS 발송
    await sendSMS(phone, code);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('인증번호 발송 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 