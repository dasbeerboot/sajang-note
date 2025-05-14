import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RouteParams = Promise<{}>;

export async function POST(req: NextRequest) {
  // 요청이 인증된 cron 서비스에서 온 것인지 확인
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다' }, { status: 401 });
  }

  // 관리자 권한을 위한 서비스 역할 클라이언트 사용
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.rpc('process_daily_refresh');

  if (error) {
    console.error('일일 리프레시 오류:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '일일 리프레시가 성공적으로 처리되었습니다',
  });
}
