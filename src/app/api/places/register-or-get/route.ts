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
} else {
  console.log('[Setup] Firecrawl API Key loaded.'); // API 키 로드 확인 로그
}

interface RequestBody {
  url: string;
}

// 개선된 네이버 플레이스 ID 추출 함수
function extractNaverPlaceId(url: string): string | null {
  if (!url) return null;

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
      return match[1];
    }
  }
  
  // 경로의 가장 마지막 숫자 부분을 ID로 간주 (최후의 수단, 주의 필요)
  // 예: https://m.place.naver.com/12345678 (실제 이런 URL이 있다면)
  const generalPathEndMatch = url.match(/\/(\d+)(?:[?#]|$)/); // ID 뒤에 ?, # 또는 문자열 끝
  if (generalPathEndMatch && generalPathEndMatch[1]) {
    return generalPathEndMatch[1];
  }

  return null;
}

export async function POST(request: Request) {
  console.log('[API Start] /api/places/register-or-get POST request received');
  try {
    const body: RequestBody = await request.json();
    const originalUrl = body.url;
    console.log('[Debug] Request body parsed, originalUrl:', originalUrl);

    if (!originalUrl) {
      console.log('[Validation Error] URL is required.');
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
    }

    const naverPlaceId = extractNaverPlaceId(originalUrl);
    console.log('[Debug] Naver Place ID extracted:', naverPlaceId);

    if (!naverPlaceId) {
      console.log('[Validation Error] Invalid Naver Place URL or ID extraction failed.');
      return NextResponse.json({ error: '유효한 네이버 플레이스 URL이 아니거나, URL에서 장소 ID를 추출할 수 없습니다.' }, { status: 400 });
    }

    console.log('[Debug] Authenticating user...');
    const cookieStore = cookies();
    const supabaseUserClient = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }); } catch {} },
          remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
        },
      }
    );
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      console.error('[Auth Error] User authentication failed:', userError?.message || 'User not found');
      return NextResponse.json({ error: '사용자 인증에 실패했습니다.' }, { status: 401 });
    }
    const userId = user.id;
    console.log('[Debug] User authenticated, userId:', userId);

    console.log('[Debug] Fetching user profile...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, max_places')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('프로필 조회 오류:', profileError?.message);
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }
    console.log('[Debug] User profile fetched:', profile);

    console.log('[Debug] Checking for existing place with naverPlaceId:', naverPlaceId);
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
      console.log('[Debug] Existing place found:', existingPlaceByNaverId);
      if (existingPlaceByNaverId.status === 'processing') {
        console.log('[Debug] Existing place is already processing.');
        return NextResponse.json({
          message: '해당 매장은 현재 처리 중입니다. 잠시 후 다시 확인해주세요.',
          placeId: existingPlaceByNaverId.id,
          naverPlaceId: existingPlaceByNaverId.place_id,
          originalUrl: existingPlaceByNaverId.place_url,
          isNew: false,
          status: existingPlaceByNaverId.status,
        }, { status: 200 });
      }
      console.log('[Debug] Returning existing place information.');
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
    console.log('[Debug] No existing place found with this naverPlaceId. Proceeding with new registration.');

    console.log('[Debug] Checking current places count for user:', userId);
    const { count: currentPlacesCount, error: countError } = await supabaseAdmin
      .from('places')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('등록된 매장 수 조회 오류:', countError.message);
      return NextResponse.json({ error: '등록된 매장 수 확인 중 오류 발생', details: countError.message }, { status: 500 });
    }
    console.log('[Debug] Current places count:', currentPlacesCount, 'Max places:', profile.max_places);

    if (currentPlacesCount !== null && currentPlacesCount >= profile.max_places) {
      console.log('[Limit Error] Place registration limit exceeded.');
      return NextResponse.json({
        error: `매장 등록 한도(${profile.max_places}개)를 초과했습니다. Pro 플랜으로 업그레이드하거나 기존 매장을 변경해주세요.`,
        errorCode: 'LIMIT_EXCEEDED'
      }, { status: 403 });
    }
    console.log('[Debug] Place registration limit check passed.');

    const now = new Date().toISOString();
    console.log('[Debug] Attempting to insert initial place record...');
    const { data: initialPlaceRecord, error: initialInsertError } = await supabaseAdmin
      .from('places')
      .insert({
        user_id: userId,
        place_id: naverPlaceId,
        place_url: originalUrl, // 사용자가 입력한 원본 URL 저장
        status: 'processing',
        created_at: now,
        updated_at: now,
        content_last_changed_at: now,
        last_crawled_at: null,
        // place_name, crawled_data는 Edge Function에서 채움
      })
      .select('id')
      .single();

    if (initialInsertError || !initialPlaceRecord) {
      console.error('초기 매장 정보 저장 오류:', initialInsertError?.message);
      return NextResponse.json({ error: '매장 정보 초기 저장 중 오류 발생', details: initialInsertError?.message }, { status: 500 });
    }
    const placePkId = initialPlaceRecord.id;
    console.log('[Debug] Initial place record inserted successfully, placePkId:', placePkId);

    // Firecrawl API 키 확인
    if (!firecrawlApiKey) {
      console.error(`[API Setup Error] Firecrawl API 키가 설정되지 않았습니다. place_pk_id: ${placePkId}`);
      await supabaseAdmin.from('places').update({ status: 'failed', error_message: '시스템 오류: Firecrawl API 키 미설정' }).eq('id', placePkId);
      return NextResponse.json({ error: 'URL 정보 수집 서비스 설정 오류입니다. 관리자에게 문의하세요.' }, { status: 503 });
    }
    console.log('[Debug] Firecrawl API key confirmed.'); // 로그 메시지 수정
    
    // 2. Firecrawl 호출을 위한 URL 표준화
    const standardizedUrlForFirecrawl = `https://m.place.naver.com/restaurant/${naverPlaceId}/home`;
    console.log(`[Debug] URL Standardized. Original: ${originalUrl}, Standardized for Firecrawl: ${standardizedUrlForFirecrawl}`);

    let firecrawlData;
    try {
      console.log(`[Firecrawl] Attempting to scrape URL for place_pk_id ${placePkId}: ${standardizedUrlForFirecrawl}`);
      const firecrawlApiUrl = 'https://api.firecrawl.dev/v1/scrape';
      const payload = {
        url: standardizedUrlForFirecrawl, 
        formats: ["markdown"], 
        onlyMainContent: false, 
        excludeTags: ['nav', 'footer', 'script', 'style', 'iframe', 'noscript'],
        waitFor: 3000, // 필요시 활성화 (페이지 로드 대기 시간)
        timeout: 55000, 
      };
      
      console.log('[Firecrawl] Request Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(firecrawlApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firecrawlApiKey}`
        },
        body: JSON.stringify(payload)
      });

      console.log(`[Firecrawl] Response status for place_pk_id ${placePkId}: ${response.status}`);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Firecrawl] API Error (${response.status}) for place_pk_id ${placePkId}: ${errorBody}`);
        throw new Error(`Firecrawl API 요청 실패 (${response.status}): ${errorBody || response.statusText}`);
      }

      const result = await response.json();
      console.log(`[Firecrawl] API response received for place_pk_id ${placePkId}. Success: ${result.success}`);
      
      if (!result.success || !result.data || !result.data.markdown || !result.data.metadata) {
        console.error(`[Firecrawl] API 응답 성공했으나 데이터 누락 for place_pk_id ${placePkId}: `, result.data ? { success: result.success, hasData: !!result.data, markdownLen: result.data.markdown?.length, metadataKeys: Object.keys(result.data.metadata || {}) } : result);
        throw new Error('Firecrawl API에서 유효한 마크다운 또는 메타데이터를 가져오지 못했습니다.');
      }
      firecrawlData = { 
        markdown: result.data.markdown,
        metadata: result.data.metadata,
      };
      console.log(`[Firecrawl] Success for place_pk_id ${placePkId}. Markdown length: ${firecrawlData.markdown.length}.`);

    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : '알 수 없는 오류';
      console.error(`[Firecrawl] API 호출/처리 중 심각한 오류 for place_pk_id ${placePkId}:`, e);
      await supabaseAdmin.from('places').update({ status: 'failed', error_message: `URL 정보 수집 오류: ${errorMsg}`.substring(0, 255) }).eq('id', placePkId);
      return NextResponse.json({ error: 'URL에서 정보를 가져오는 중 오류가 발생했습니다.', details: errorMsg }, { status: 500 });
    }

    // 3. Supabase Edge Function 비동기 호출 (AI 분석 요청)
    console.log(`[Debug] Attempting to invoke Edge Function 'process-ai-analysis' for place_pk_id ${placePkId}`);
    try {
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
        await supabaseAdmin.from('places').update({ status: 'failed', error_message: `AI 분석 서비스 호출 실패: ${functionError.message}`.substring(0, 255) }).eq('id', placePkId);
        return NextResponse.json({ error: '매장 정보 분석 시작 중 내부 오류가 발생했습니다.', details: functionError.message }, { status: 500 });
      }

      console.log(`[Edge Function] Successfully invoked 'process-ai-analysis' for place_pk_id ${placePkId}`);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : '알 수 없는 오류';
      console.error(`[Edge Function] Critical error during invoke for 'process-ai-analysis', place_pk_id ${placePkId}:`, e);
      await supabaseAdmin.from('places').update({ status: 'failed', error_message: `AI 분석 서비스 호출 중 예외 발생: ${errorMsg}`.substring(0, 255) }).eq('id', placePkId);
      return NextResponse.json({ error: '매장 정보 분석 시작 중 예기치 않은 오류가 발생했습니다.', details: errorMsg }, { status: 500 });
    }
    
    console.log(`[API End] Sending 202 Accepted for place_pk_id ${placePkId}`);
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