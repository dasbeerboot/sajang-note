import { NextResponse } from 'next/server';
import axios from 'axios';

// 환경 변수
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/process-recurring-payments`;

export async function GET() {
  try {
    // Vercel cron job의 User-Agent 확인
    // 실제 프로덕션에서는 이 검증을 사용할 수 있습니다
    // if (!req.headers.get('user-agent')?.includes('vercel-cron')) {
    //   return NextResponse.json({ error: '인증되지 않은 요청' }, { status: 401 });
    // }

    // Supabase Edge Function 호출
    const response = await axios.get(EDGE_FUNCTION_URL, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('정기 결제 처리 중 오류:', error);
    
    if (axios.isAxiosError(error)) {
      // AxiosError인 경우, response 객체가 있을 수 있음
      const status = error.response?.status || 500;
      const details = error.response?.data || error.message;
      return NextResponse.json(
        { error: '정기 결제 처리 실패', details },
        { status }
      );
    } else if (error instanceof Error) {
      // 일반 Error 객체인 경우
      return NextResponse.json(
        { error: '정기 결제 처리 실패', message: error.message },
        { status: 500 }
      );
    } else {
      // 알 수 없는 타입의 에러
      return NextResponse.json(
        { error: '정기 결제 처리 중 알 수 없는 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  }
}

// 헤더 설정
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 최대 실행 시간 5분 