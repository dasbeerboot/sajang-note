import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 관리자만 접근할 수 있는 마이그레이션 API
export async function POST(request: Request) {
  try {
    // 인증 확인
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 관리자 권한 확인 (예: 특정 이메일 또는 역할)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!adminEmails.includes(session.user.email || '')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }
    
    // 요청 데이터 파싱
    const { action } = await request.json();
    
    if (action === 'create_tables') {
      // 구독 플랜 테이블 생성
      await supabase.rpc('create_subscription_tables');
      
      // 기본 구독 플랜 추가
      await supabase.from('subscription_plans').insert([
        {
          name: '프리미엄 월간',
          description: '모든 프리미엄 기능 이용 가능',
          price: 9900,
          interval: 'monthly',
          features: ['무제한 거래처 관리', '고급 통계 기능', '자동 알림 서비스'],
          active: true
        },
        {
          name: '프리미엄 연간',
          description: '연간 결제로 16% 할인',
          price: 99000,
          interval: 'yearly',
          features: ['무제한 거래처 관리', '고급 통계 기능', '자동 알림 서비스', '우선 기술 지원'],
          active: true
        }
      ]);
      
      // 구독 시작 함수 생성
      await supabase.rpc('create_subscription_functions');
      
      return NextResponse.json({ success: true, message: '구독 시스템 테이블과 함수가 생성되었습니다.' });
    } else if (action === 'update_profiles') {
      // profiles 테이블에 구독 관련 필드 추가
      await supabase.rpc('update_profiles_table');
      
      return NextResponse.json({ success: true, message: 'profiles 테이블이 업데이트되었습니다.' });
    } else {
      return NextResponse.json({ error: '유효하지 않은 액션입니다.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('마이그레이션 오류:', error);
    return NextResponse.json({ error: '마이그레이션 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 