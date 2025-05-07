import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { message: '전화번호와 인증번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 인증 코드 확인
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: '유효하지 않은 인증번호이거나 만료되었습니다.' },
        { status: 400 }
      );
    }

    // 인증 코드 사용 처리
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', data.id);

    // 사용자 프로필 업데이트 - 전화번호 인증 상태 변경
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .update({ phone_verified: true })
      .eq('phone', phone);

    if (userError) {
      console.error('사용자 프로필 업데이트 오류:', userError);
    }

    return NextResponse.json(
      { message: '인증이 완료되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('인증번호 확인 오류:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 