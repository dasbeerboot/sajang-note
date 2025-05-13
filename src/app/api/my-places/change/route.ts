import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface RequestBody {
  placeId: string;     // 변경할 매장 ID (places 테이블의 id)
  newPlaceUrl: string; // 새 네이버 플레이스 URL
}

// 서비스 롤 키를 사용하는 Supabase 클라이언트 생성
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 네이버 플레이스 ID 추출 함수
function extractNaverPlaceId(url: string): string | null {
  if (!url) return null;

  // map.naver.com의 새로운 URL 형식 먼저 확인
  const newNaverMapPattern = /map\.naver\.com\/p\/.*\/place\/(\d+)/;
  const newNaverMapMatch = url.match(newNaverMapPattern);
  if (newNaverMapMatch && newNaverMapMatch[1]) {
    return newNaverMapMatch[1];
  }

  // 기존 패턴들
  const patterns = [
    /\/restaurant\/(\d+)/,
    /\/place\/(\d+)/,       
    /\/establishments\/(\d+)/,
    /\/attractions\/(\d+)/,
    /\/accommodations\/(\d+)/,
    /\/beauty\/(\d+)/,
    /\/hospital\/(\d+)/,
    /\/shopping\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // 경로의 가장 마지막 숫자 부분을 ID로 간주
  const generalPathEndMatch = url.match(/\/(\d+)(?:[?#]|$)/);
  if (generalPathEndMatch && generalPathEndMatch[1]) {
    return generalPathEndMatch[1];
  }

  return null;
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
    const { placeId, newPlaceUrl } = body;
    
    if (!placeId || !newPlaceUrl) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 새 네이버 플레이스 ID 추출
    const newNaverPlaceId = extractNaverPlaceId(newPlaceUrl);
    if (!newNaverPlaceId) {
      return NextResponse.json({ 
        error: '유효한 네이버 플레이스 URL이 아니거나, URL에서 장소 ID를 추출할 수 없습니다.' 
      }, { status: 400 });
    }
    
    // 현재 매장이 사용자의 것인지 확인
    const { data: placeData, error: placeError } = await serviceClient
      .from('places')
      .select('id, place_id, status')
      .eq('id', placeId)
      .eq('user_id', userId)
      .single();
      
    if (placeError || !placeData) {
      return NextResponse.json({ error: '해당 매장을 찾을 수 없거나 접근 권한이 없습니다.' }, { status: 404 });
    }
    
    // 매장 상태 확인 - 이미 처리 중인 경우 변경 요청 거부
    if (placeData.status === 'processing') {
      return NextResponse.json({ 
        error: '해당 매장은 이미 처리 중입니다. 완료 후 다시 시도해주세요.' 
      }, { status: 400 });
    }
    
    // 변경 가능 여부 확인
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('next_place_change_date, first_place_change_used')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    const now = new Date();
    let canChangePlace = true;
    
    // 첫 변경이 아니고, 다음 변경 가능 날짜가 미래인 경우 변경 불가
    if (profileData.first_place_change_used && 
        profileData.next_place_change_date && 
        new Date(profileData.next_place_change_date) > now) {
      return NextResponse.json({ 
        error: '매장 변경 간격 제한으로 아직 변경할 수 없습니다.', 
        next_change_available_date: profileData.next_place_change_date
      }, { status: 403 });
    }
    
    // 개선된 방식: 변경 프로세스를 두 단계로 분리
    // 1단계: prepare_place_change - 변경 가능 확인 후 정보 초기화 (변경 횟수 미차감)
    const { data: prepareData, error: prepareError } = await serviceClient.rpc(
      'prepare_place_change',
      {
        p_user_id: userId,
        p_place_id: placeId,
        p_new_naver_place_id: newNaverPlaceId,
        p_new_place_url: newPlaceUrl
      }
    );
    
    if (prepareError) {
      console.error('매장 변경 준비 오류:', prepareError);
      return NextResponse.json({ 
        error: '매장 변경 준비 중 오류가 발생했습니다.', 
        details: prepareError.message 
      }, { status: 500 });
    }
    
    console.log('매장 변경 준비 완료:', prepareData);
    
    // 필요한 크롤링 데이터 가져오기
    try {
      console.log(`[Firecrawl] 매장 정보 수집 시작: 네이버 ID ${newNaverPlaceId}`);
      
      // FireCrawl API 설정
      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlApiKey) {
        throw new Error('Firecrawl API 키가 설정되지 않았습니다.');
      }
      
      // 표준화된 URL 생성 (m.place 형식)
      const standardizedUrlForFirecrawl = `https://m.place.naver.com/restaurant/${newNaverPlaceId}/home`;
      
      // FireCrawl API 호출
      const firecrawlApiUrl = 'https://api.firecrawl.dev/v1/scrape';
      const payload = {
        url: standardizedUrlForFirecrawl, 
        formats: ["markdown"], 
        onlyMainContent: false, 
        excludeTags: ['nav', 'footer', 'script', 'style', 'iframe', 'noscript'],
        waitFor: 3000,
        timeout: 55000, 
      };

      const response = await fetch(firecrawlApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firecrawlApiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Firecrawl] API Error (${response.status}): ${errorBody}`);
        throw new Error(`Firecrawl API 요청 실패 (${response.status}): ${errorBody || response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.data || !result.data.markdown || !result.data.metadata) {
        throw new Error('Firecrawl API에서 유효한 마크다운 또는 메타데이터를 가져오지 못했습니다.');
      }
      
      // 크롤링 데이터
      const firecrawlData = { 
        markdown: result.data.markdown,
        metadata: result.data.metadata,
      };
      console.log(`[Firecrawl] 매장 정보 수집 완료`);
      
      // Edge Function 호출
      console.log(`[Edge Function] 매장 ${placeId} AI 분석 처리 요청`);
      const { error: functionError } = await serviceClient.functions.invoke(
        'process-ai-analysis', 
        { body: { 
            place_pk_id: placeId, 
            firecrawl_markdown: firecrawlData.markdown, 
            firecrawl_metadata: firecrawlData.metadata 
          } 
        }
      );

      if (functionError) {
        console.error(`[Edge Function] Invoke failed for 'process-ai-analysis', place_pk_id ${placeId}:`, functionError);
        // 상태를 failed로 업데이트
        await serviceClient
          .from('places')
          .update({ 
            status: 'failed',
            error_message: `Edge Function 오류: ${functionError.message}`.substring(0, 255) 
          })
          .eq('id', placeId);
          
        return NextResponse.json({ 
          error: '매장 정보 분석 시작 중 내부 오류가 발생했습니다. 다시 시도해주세요.', 
          details: functionError.message 
        }, { status: 500 });
      }
      
      console.log(`[Edge Function] 매장 ${placeId} AI 분석 요청 성공`);
      
    } catch (e: any) {
      console.error('데이터 수집 또는 Edge Function 호출 오류:', e);
      // 상태를 failed로 업데이트
      await serviceClient
        .from('places')
        .update({ 
          status: 'failed',
          error_message: `데이터 수집 오류: ${e.message}`.substring(0, 255) 
        })
        .eq('id', placeId);
        
      return NextResponse.json({ 
        error: '매장 정보 수집 중 오류가 발생했습니다.', 
        details: e.message 
      }, { status: 500 });
    }
    
    // 크롤링 처리는 클라이언트 측에서 기다리게 하고, 
    // 여기서는 변경 준비 성공 응답만 반환
    // 2단계 (complete_place_change)는 크롤링 및 AI 처리 성공 후 별도 API에서 호출
    
    return NextResponse.json({ 
      success: true, 
      message: '매장 변경이 준비되었습니다. 데이터 처리가 진행 중입니다.', 
      status: 'processing',
      data: prepareData
    });
    
  } catch (error: any) {
    console.error('매장 변경 API 오류:', error);
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다.', details: errorMsg }, { status: 500 });
  }
} 