import { NextResponse } from 'next/server';
import axios from 'axios';

// 환경 변수
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET;

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/process-recurring-payments`;

export async function GET(request: Request) {
  try {
    // CRON_SECRET 검증
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET) {
      // CRON_SECRET 환경 변수가 설정되지 않은 경우 서버 내부 오류로 처리
      console.error('CRON_SECRET이 서버에 설정되지 않았습니다.');
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 });
    }
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: '인증되지 않은 요청' }, { status: 401 });
    }

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