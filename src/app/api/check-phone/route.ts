import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// 서비스 롤 키를 사용하는 Supabase 클라이언트 생성
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const requestData = await request.json();
    const { phone } = requestData;

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: '유효한 전화번호를 입력해주세요.' }, { status: 400 });
    }

    // 전화번호 형식 검증
    const phoneRegex = /^01([0|1|6|7|8|9])([0-9]{3,4})([0-9]{4})$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: '유효한 전화번호 형식이 아닙니다.' }, { status: 400 });
    }

    // 로깅
    console.log(`[check-phone] 전화번호 중복 확인: ${phone}`);

    // 서비스 롤 클라이언트를 사용하여 전화번호 조회
    const serviceClient = createServiceClient();

    // 1. 현재 사용 중인 번호 확인
    const { data: existingPhone, error: phoneCheckError } = await serviceClient
      .from('profiles')
      .select('id, phone_verified')
      .eq('phone', phone)
      .eq('phone_verified', true)
      .maybeSingle();

    // 이미 인증된 번호가 있으면 에러
    if (existingPhone) {
      console.log(`[check-phone] 중복된 전화번호 발견: ${phone}`);
      return NextResponse.json({ error: '이미 사용 중인 전화번호입니다.' }, { status: 400 });
    }

    if (phoneCheckError) {
      console.error('[check-phone] 전화번호 중복 확인 오류:', phoneCheckError);
      return NextResponse.json({ error: '전화번호 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 2. phone_trial_records 테이블에서 재가입 시도 확인
    // 전화번호 해시 생성
    const phoneHash = crypto.createHash('md5').update(phone).digest('hex');

    const { data: trialRecord, error: trialError } = await serviceClient
      .from('phone_trial_records')
      .select('*')
      .eq('phone_hash', phoneHash)
      .maybeSingle();

    if (trialError) {
      console.error('[check-phone] 재가입 기록 확인 오류:', trialError);
      return NextResponse.json({ error: '전화번호 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 이전에 사용된 번호인 경우 (재가입 허용하지만 무료 체험 0회로 표시)
    if (trialRecord) {
      console.log(`[check-phone] 이전 가입 기록 발견: ${phone}, 횟수: ${trialRecord.usage_count}`);

      return NextResponse.json({
        success: true,
        message:
          '사용 가능한 전화번호입니다. 이전에 사용한 이력이 있어 무료 체험 횟수는 0회로 설정됩니다.',
        isReturningUser: true,
        usageCount: trialRecord.usage_count,
      });
    }

    // 처음 사용하는 번호인 경우
    console.log(`[check-phone] 사용 가능한 전화번호: ${phone}`);
    return NextResponse.json({
      success: true,
      message: '사용 가능한 전화번호입니다.',
      isReturningUser: false,
    });
  } catch (error) {
    console.error('[check-phone] 전화번호 확인 중 예외 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
