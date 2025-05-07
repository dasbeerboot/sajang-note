import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 6자리 랜덤 숫자 생성
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || !/^01[016789][0-9]{7,8}$/.test(phone)) {
      return NextResponse.json(
        { message: '유효하지 않은 전화번호입니다.' },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    
    // 인증 코드 저장 (verification_codes 테이블이 있다고 가정)
    const { error } = await supabase
      .from('verification_codes')
      .insert({
        phone,
        code: verificationCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10분 후 만료
      });

    if (error) {
      console.error('인증 코드 저장 오류:', error);
      return NextResponse.json(
        { message: '인증 코드 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 실제 SMS 발송 로직 (여기서는 로깅만 수행)
    // TODO: 실제 SMS 발송 서비스 연동 (예: Solapi, Twilio 등)
    console.log(`SMS 발송: ${phone}로 인증번호 ${verificationCode} 발송`);

    return NextResponse.json(
      { message: '인증번호가 발송되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('인증번호 발송 오류:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 