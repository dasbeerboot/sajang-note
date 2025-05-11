// src/app/api/places/[placeId]/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    placeId: string; 
  };
}

export async function GET(request: Request, context: RouteParams) {
  try {
    // 이제 페이지 컴포넌트에서 직접 데이터베이스에 접근하므로
    // 이 API 라우트는 더 이상 사용되지 않습니다.
    // 그러나 기존 호출이 있을 수 있으므로 응답은 유지합니다.
    
    const placeId = context.params.placeId;
    
    console.log(`[API GET /api/places/${placeId}] 요청 받음 (이 API는 더 이상 사용되지 않음)`);
    
    return NextResponse.json({ 
      info: '이 API는 더 이상 사용되지 않습니다. 페이지 컴포넌트에서 직접 데이터베이스에 접근합니다.',
      placeId 
    });
    
  } catch (error: any) {
    console.error(`[API GET /api/places] 오류:`, error);
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
