import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 서비스 롤 키를 사용하는 Supabase 클라이언트 생성
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    // 쿠키 스토어 가져오기
    const cookieStore = await cookies();
    
    // Supabase 클라이언트 생성
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
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

    // 현재 로그인한 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    const userId = user.id;
    const serviceClient = createServiceClient();
    
    // 사용자 프로필 정보 조회
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('max_places, next_place_change_date, first_place_change_used, subscription_tier, remaining_place_changes')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('프로필 조회 오류:', profileError);
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 사용자 매장 목록 조회
    const { data: placesData, error: placesError } = await serviceClient
      .from('places')
      .select(`
        id, 
        place_id, 
        place_name, 
        place_address, 
        place_url, 
        status, 
        created_at, 
        content_last_changed_at,
        crawled_data
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (placesError) {
      console.error('매장 조회 오류:', placesError);
      return NextResponse.json({ error: '매장 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 매장별 카피 생성 수 조회
    const { data: copiesData, error: copiesError } = await serviceClient
      .from('ai_generated_copies')
      .select('place_id')
      .eq('user_id', userId);
      
    const copiesCountMap = new Map();
    if (!copiesError && copiesData) {
      // 각 장소별로 카피 수를 계산
      copiesData.forEach(item => {
        const count = copiesCountMap.get(item.place_id) || 0;
        copiesCountMap.set(item.place_id, count + 1);
      });
    }
    
    // 결과 데이터 구성
    const placesWithCopiesCount = placesData.map((place) => ({
      ...place,
      copies_count: copiesCountMap.get(place.id) || 0
    }));
    
    // 실제 사용 중인 매장 수 계산 (failed 상태 제외)
    const activePlacesCount = placesData.filter(place => place.status !== 'failed').length;
    
    // 변경 가능 여부 확인
    const { data: changeInfo, error: changeError } = await serviceClient.rpc('get_user_change_info', {
      p_user_id: userId
    });
    
    if (changeError) {
      console.error('변경 가능 여부 조회 오류:', changeError);
      
      // 오류 발생 시 기본 값으로 대체
      const defaultChangeInfo = {
        can_change_place: profileData.remaining_place_changes > 0 || !profileData.first_place_change_used,
        next_change_available_date: profileData.next_place_change_date,
        has_wildcard_available: !profileData.first_place_change_used,
        remaining_place_changes: profileData.remaining_place_changes || 0
      };
      
      return NextResponse.json({
        profile: {
          max_places: profileData.max_places,
          used_places: activePlacesCount,
          subscription_tier: profileData.subscription_tier,
          next_place_change_date: profileData.next_place_change_date,
          remaining_place_changes: profileData.remaining_place_changes || 0
        },
        places: placesWithCopiesCount,
        change_info: defaultChangeInfo
      });
    }
    
    return NextResponse.json({
      profile: {
        max_places: profileData.max_places,
        used_places: activePlacesCount,
        subscription_tier: profileData.subscription_tier,
        next_place_change_date: profileData.next_place_change_date,
        remaining_place_changes: profileData.remaining_place_changes || 0
      },
      places: placesWithCopiesCount,
      change_info: {
        can_change_place: changeInfo.can_change_place,
        next_change_available_date: changeInfo.next_change_available_date,
        has_wildcard_available: changeInfo.has_wildcard_available,
        remaining_place_changes: changeInfo.remaining_place_changes || 0
      }
    });
    
  } catch (error: unknown) {
    console.error('내 매장 목록 조회 API 오류:', error);
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다.', details: errorMsg }, { status: 500 });
  }
} 