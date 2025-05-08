import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import axios from 'axios';

// 솔라피 알림톡으로 인증번호를 발송하는 함수
async function sendSMS(phone: string, code: string): Promise<boolean> {
  try {
    // API 키가 설정되지 않은 경우 개발 모드로 간주하고 콘솔에 출력
    if (!process.env.SOLAPI_API_KEY) {
      console.log(`[개발 모드] 인증번호: ${phone}로 인증번호 ${code} 발송`);
      return true;
    }
    
    console.log(`SMS 발송: ${phone}로 인증번호 발송 시도`);
    
    // 발신번호 (환경 변수에서 가져오거나 기본값 사용)
    const senderNumber = process.env.SOLAPI_SENDER_NUMBER || '01012345678';
    
    // 솔라피 알림톡 API 호출
    const messageContent = `#{날짜}: ⚠️사장노트 인증번호는 ${code}입니다. 3분 이내에 입력해주세요.⚠️\n#{미팅이름}: ⚠️테스트⚠️\n#{url}: https://sajang-note.vercel.app/`;
    const response = await axios.post('https://api.solapi.com/messages/v4/send', {
      message: {
        to: phone,
        from: senderNumber,
        text: messageContent,
        type: 'ATA', // 알림톡 타입
        kakaoOptions: {
          pfId: 'KA01PF2504110309591075HUSei4iarb',
          templateId: 'KA01TP250430143738849XalNf3Jco1v',
          variables: {
            "#{날짜}": `⚠️사장노트 인증번호는 ${code}입니다. 3분 이내에 입력해주세요.⚠️`,
            "#{미팅이름}": '⚠️테스트⚠️',
            "#{url}": 'https://sajang-note.vercel.app/'
          }
        }
      }
    }, {
      headers: {
        'Authorization': `HMAC-SHA256 apiKey=${process.env.SOLAPI_API_KEY}, date=${new Date().toISOString()}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('솔라피 응답:', response.data);
    return true;
  } catch (error) {
    console.error('솔라피 API 호출 오류:', error);
    
    // 개발 환경에서는 실패해도 성공으로 처리 (테스트 목적)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[개발 모드] 인증번호: ${phone}로 인증번호 ${code} 발송 (API 오류 무시)`);
      return true;
    }
    
    return false;
  }
}

// 6자리 랜덤 인증번호 생성
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const requestData = await request.json();
    const { phone, isSignup = false } = requestData;
    
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
    
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: '유효한 전화번호를 입력해주세요.' }, { status: 400 });
    }
    
    // 전화번호 형식 검증
    const phoneRegex = /^01([0|1|6|7|8|9])([0-9]{3,4})([0-9]{4})$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: '유효한 전화번호 형식이 아닙니다.' }, { status: 400 });
    }
    
    // 회원가입이 아닌 경우에만 이미 인증된 전화번호인지 확인
    if (!isSignup && userId) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('phone, phone_verified')
        .eq('phone', phone)
        .eq('phone_verified', true)
        .neq('id', userId)
        .maybeSingle();
      
      if (existingProfile) {
        return NextResponse.json({ error: '이미 사용 중인 전화번호입니다.' }, { status: 400 });
      }
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
    
    // 솔라피 알림톡으로 인증번호 발송
    const smsResult = await sendSMS(phone, code);
    
    if (!smsResult) {
      return NextResponse.json({ error: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('인증번호 발송 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 