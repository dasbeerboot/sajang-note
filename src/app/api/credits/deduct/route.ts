import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // 세션 확인하여 사용자 인증
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다' }, { status: 401 });
  }

  const body = await req.json();
  const { feature } = body;

  // 기능과 금액 유효성 검증
  if (!feature || !['ai_copy', 'blog'].includes(feature)) {
    return NextResponse.json({ error: '유효하지 않은 기능입니다' }, { status: 400 });
  }

  // 적절한 크레딧 차감량 계산 (블로그는 2크레딧)
  const creditsToDeduct = feature === 'blog' ? 2 : 1;

  // 차감 함수 호출
  const { data, error } = await supabase.rpc('deduct_user_credits', {
    p_user_id: session.user.id,
    p_feature: feature,
    p_amount: creditsToDeduct,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data === false) {
    return NextResponse.json({ error: '크레딧이 부족합니다' }, { status: 403 });
  }

  // 업데이트된 크레딧 정보 반환
  const { data: userData } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', session.user.id)
    .single();

  return NextResponse.json({
    success: true,
    remaining_credits: userData?.credits || 0,
  });
}
