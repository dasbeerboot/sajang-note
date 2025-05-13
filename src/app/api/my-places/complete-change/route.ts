import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RequestBody {
  placeId: string;      // 변경된 매장 ID
  isFirstChange: boolean; // 첫 변경 여부
}

// 서비스 롤 키를 사용하는 Supabase 클라이언트 생성
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
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
    
    // 사용자 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const serviceClient = createServiceClient();
    
    // 요청 데이터 확인
    const body: RequestBody = await request.json();
    const { placeId, isFirstChange } = body;
    
    if (!placeId) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }
    
    // 매장 상태 확인
    const { data: placeData, error: placeError } = await serviceClient
      .from('places')
      .select('id, status')
      .eq('id', placeId)
      .eq('user_id', userId)
      .single();
      
    if (placeError || !placeData) {
      return NextResponse.json({ 
        error: '해당 매장을 찾을 수 없거나 접근 권한이 없습니다.' 
      }, { status: 404 });
    }
    
    // 매장 상태가 completed인지 확인
    if (placeData.status !== 'completed') {
      return NextResponse.json({ 
        error: '매장 정보 처리가 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요.' 
      }, { status: 400 });
    }
    
    // 2단계: complete_place_change - 변경 완료 및 변경 횟수 차감
    const { data: completeData, error: completeError } = await serviceClient.rpc(
      'complete_place_change',
      {
        p_user_id: userId,
        p_place_id: placeId,
        p_is_first_change: isFirstChange
      }
    );
    
    if (completeError) {
      console.error('매장 변경 완료 오류:', completeError);
      return NextResponse.json({ 
        error: '매장 변경 완료 중 오류가 발생했습니다.', 
        details: completeError.message 
      }, { status: 500 });
    }
    
    console.log('매장 변경 완료:', completeData);
    
    return NextResponse.json({ 
      success: true, 
      message: '매장 변경이 완료되었습니다.', 
      data: completeData
    });
    
  } catch (error: any) {
    console.error('매장 변경 완료 API 오류:', error);
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: '요청 처리 중 오류가 발생했습니다.', 
      details: errorMsg 
    }, { status: 500 });
  }
} 