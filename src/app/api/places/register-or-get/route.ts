import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // @supabase/ssr 사용
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // 라우트를 동적으로 처리하도록 명시

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Admin client는 서비스 키를 사용하므로 @supabase/supabase-js의 createClient 사용
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
if (!firecrawlApiKey) {
  console.warn('FIRECRAWL_API_KEY is not set. Crawling features will be disabled.');
}

interface RequestBody {
  url: string;
}

// 개선된 네이버 플레이스 ID 추출 함수
function extractNaverPlaceId(url: string): string | null {
  if (!url) return null;

  console.log(`[NaverPlace] 입력된 URL: ${url}`);

  // map.naver.com의 새로운 URL 형식 먼저 확인
  const newNaverMapPattern = /map\.naver\.com\/p\/.*\/place\/(\d+)/;
  const newNaverMapMatch = url.match(newNaverMapPattern);
  if (newNaverMapMatch && newNaverMapMatch[1]) {
    console.log(`[NaverPlace] 새 네이버맵 URL에서 추출: ${newNaverMapMatch[1]}`);
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
    // 더 많은 네이버 플레이스 카테고리 경로 패턴 추가 가능
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      console.log(`[NaverPlace] 기존 패턴에서 추출: ${match[1]}`);
      return match[1];
    }
  }
  
  // 경로의 가장 마지막 숫자 부분을 ID로 간주 (최후의 수단, 주의 필요)
  // 예: https://m.place.naver.com/12345678 (실제 이런 URL이 있다면)
  const generalPathEndMatch = url.match(/\/(\d+)(?:[?#]|$)/); // ID 뒤에 ?, # 또는 문자열 끝
  if (generalPathEndMatch && generalPathEndMatch[1]) {
    console.log(`[NaverPlace] 일반 경로에서 추출: ${generalPathEndMatch[1]}`);
    return generalPathEndMatch[1];
  }

  console.log(`[NaverPlace] ID 추출 실패: ${url}`);
  return null;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const originalUrl = body.url;

    if (!originalUrl) {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
    }

    const naverPlaceId = extractNaverPlaceId(originalUrl);

    if (!naverPlaceId) {
      return NextResponse.json({ error: '유효한 네이버 플레이스 URL이 아니거나, URL에서 장소 ID를 추출할 수 없습니다.' }, { status: 400 });
    }

    // Supabase 클라이언트 초기화 - 쿠키 정보 참고 재작성
    const cookieStore = await cookies();
    
    const supabaseUserClient = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
    
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      console.error('[Auth Error] User authentication failed:', userError?.message || 'User not found');
      return NextResponse.json({ error: '사용자 인증에 실패했습니다.' }, { status: 401 });
    }
    const userId = user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, max_places')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('프로필 조회 오류:', profileError?.message);
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: existingPlaceByNaverId, error: existingPlaceError } = await supabaseAdmin
      .from('places')
      .select('id, place_url, content_last_changed_at, place_id, status')
      .eq('user_id', userId)
      .eq('place_id', naverPlaceId)
      .maybeSingle();

    if (existingPlaceError && existingPlaceError.code !== 'PGRST116') {
      console.error('기존 매장(네이버ID 기준) 조회 오류:', existingPlaceError.message);
      return NextResponse.json({ error: '기존 매장 정보 조회 중 오류 발생', details: existingPlaceError.message }, { status: 500 });
    }

    if (existingPlaceByNaverId) {
      if (existingPlaceByNaverId.status === 'processing') {
        return NextResponse.json({
          message: '해당 매장은 현재 처리 중입니다. 잠시 후 다시 확인해주세요.',
          placeId: existingPlaceByNaverId.id,
          naverPlaceId: existingPlaceByNaverId.place_id,
          originalUrl: existingPlaceByNaverId.place_url,
          isNew: false,
          status: existingPlaceByNaverId.status,
        }, { status: 200 });
      }
      
      return NextResponse.json({
        message: `이미 등록된 매장입니다. 현재 상태: ${existingPlaceByNaverId.status}`,
        placeId: existingPlaceByNaverId.id,
        naverPlaceId: existingPlaceByNaverId.place_id,
        originalUrl: existingPlaceByNaverId.place_url,
        isNew: false,
        status: existingPlaceByNaverId.status,
        contentLastChangedAt: existingPlaceByNaverId.content_last_changed_at
      });
    }

    const { count: currentPlacesCount, error: countError } = await supabaseAdmin
      .from('places')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('등록된 매장 수 조회 오류:', countError.message);
      return NextResponse.json({ error: '등록된 매장 수 확인 중 오류 발생', details: countError.message }, { status: 500 });
    }

    if (currentPlacesCount !== null && currentPlacesCount >= profile.max_places) {
      return NextResponse.json({
        error: `매장 등록 한도(${profile.max_places}개)를 초과했습니다. Pro 플랜으로 업그레이드하거나 기존 매장을 변경해주세요.`,
        errorCode: 'LIMIT_EXCEEDED'
      }, { status: 403 });
    }

    // Firecrawl API 키 확인
    if (!firecrawlApiKey) {
      console.error(`[API Setup Error] Firecrawl API 키가 설정되지 않았습니다.`);
      return NextResponse.json({ error: 'URL 정보 수집 서비스 설정 오류입니다. 관리자에게 문의하세요.' }, { status: 503 });
    }
    
    // 1. 먼저 크롤링 수행 - 성공 시에만 DB에 저장
    const standardizedUrlForFirecrawl = `https://m.place.naver.com/restaurant/${naverPlaceId}/home`;
    let firecrawlData;

    try {
      console.log(`[Firecrawl] 매장 정보 수집 시작: ${standardizedUrlForFirecrawl}`);
      const firecrawlApiUrl = 'https://api.firecrawl.dev/v1/scrape';
      const payload = {
        url: standardizedUrlForFirecrawl, 
        formats: ["markdown"], 
        onlyMainContent: false, 
        excludeTags: ['nav', 'footer', 'script', 'style', 'iframe', 'noscript'],
        waitFor: 3000, // 필요시 활성화 (페이지 로드 대기 시간)
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
        console.error(`[Firecrawl] API 응답 성공했으나 데이터 누락`);
        throw new Error('Firecrawl API에서 유효한 마크다운 또는 메타데이터를 가져오지 못했습니다.');
      }
      
      firecrawlData = { 
        markdown: result.data.markdown,
        metadata: result.data.metadata,
      };
      console.log(`[Firecrawl] 매장 정보 수집 완료`);

    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : '알 수 없는 오류';
      console.error(`[Firecrawl] API 호출/처리 중 심각한 오류:`, e);
      return NextResponse.json({ error: 'URL에서 정보를 가져오는 중 오류가 발생했습니다.', details: errorMsg }, { status: 500 });
    }

    // 2. 크롤링 성공 후 DB에 레코드 생성
    const now = new Date().toISOString();
    const { data: initialPlaceRecord, error: initialInsertError } = await supabaseAdmin
      .from('places')
      .insert({
        user_id: userId,
        place_id: naverPlaceId,
        place_url: standardizedUrlForFirecrawl,
        status: 'processing',
        created_at: now,
        updated_at: now,
        content_last_changed_at: now,
        last_crawled_at: now,
      })
      .select('id')
      .single();

    if (initialInsertError || !initialPlaceRecord) {
      console.error('초기 매장 정보 저장 오류:', initialInsertError?.message);
      return NextResponse.json({ error: '매장 정보 저장 중 오류 발생', details: initialInsertError?.message }, { status: 500 });
    }
    
    const placePkId = initialPlaceRecord.id;
    
    // 3. Edge Function 호출
    try {
      console.log(`[Edge Function] 매장 ${placePkId} AI 분석 처리 요청`);
      const { error: functionError } = await supabaseAdmin.functions.invoke(
        'process-ai-analysis', 
        { body: { 
            place_pk_id: placePkId, 
            firecrawl_markdown: firecrawlData.markdown, 
            firecrawl_metadata: firecrawlData.metadata 
          } 
        }
      );

      if (functionError) {
        console.error(`[Edge Function] Invoke failed for 'process-ai-analysis', place_pk_id ${placePkId}:`, functionError);
        
        // Edge Function 호출 실패 시 places 테이블에서 레코드 삭제
        console.log(`[Cleanup] 매장 ${placePkId} AI 분석 실패로 레코드 삭제`);
        const { error: deleteError } = await supabaseAdmin
          .from('places')
          .delete()
          .eq('id', placePkId);
          
        if (deleteError) {
          console.error(`[Cleanup Error] 매장 ${placePkId} 삭제 실패:`, deleteError);
        }
        
        return NextResponse.json({ error: '매장 정보 분석 시작 중 내부 오류가 발생했습니다. 다시 시도해주세요.', details: functionError.message }, { status: 500 });
      }

    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : '알 수 없는 오류';
      console.error(`[Edge Function] Critical error during invoke for 'process-ai-analysis', place_pk_id ${placePkId}:`, e);
      
      // 예외 발생 시 places 테이블에서 레코드 삭제
      console.log(`[Cleanup] 매장 ${placePkId} AI 분석 예외로 레코드 삭제`);
      const { error: deleteError } = await supabaseAdmin
        .from('places')
        .delete()
        .eq('id', placePkId);
        
      if (deleteError) {
        console.error(`[Cleanup Error] 매장 ${placePkId} 삭제 실패:`, deleteError);
      }
      
      return NextResponse.json({ error: '매장 정보 분석 시작 중 예기치 않은 오류가 발생했습니다.', details: errorMsg }, { status: 500 });
    }
    
    return NextResponse.json({
      message: '매장 정보 수집 요청이 접수되었으며, AI 분석이 백그라운드에서 진행됩니다. 잠시 후 \'My 플레이스\' 메뉴에서 확인해주세요.',
      placeId: placePkId, 
      naverPlaceId: naverPlaceId,
      isNew: true, 
      status: 'processing' 
    }, { status: 202 });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('매장 등록/조회 API 전체 오류:', error);
    return NextResponse.json({ error: '요청 처리 중 알 수 없는 오류가 발생했습니다.', details: errorMsg }, { status: 500 });
  }
} 