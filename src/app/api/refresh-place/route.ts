import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { crawlWithFirecrawl } from '@/lib/apis/crawl-utils';

// 서비스 롤 키를 사용하는 Supabase 클라이언트 생성
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Firecrawl API 키 가져오기
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
if (!firecrawlApiKey) {
  console.warn('FIRECRAWL_API_KEY is not set. Crawling features will be disabled.');
}

// 요청에서 인증 정보를 추출하여 사용자 정보 가져오기
async function getUserFromRequest(request: Request) {
  try {
    // 요청 헤더에서 Authorization 토큰 추출
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      console.log('[refresh-place] 인증 토큰이 없습니다');
      return null;
    }

    // 서비스 롤 클라이언트로 토큰 검증 및 사용자 정보 가져오기
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient.auth.getUser(token);

    if (error) {
      console.error('[refresh-place] 토큰 검증 오류:', error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('[refresh-place] 사용자 인증 처리 중 오류:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const requestData = await request.json();
    const { placeId } = requestData;

    if (!placeId) {
      return NextResponse.json({ error: '매장 ID가 필요합니다.' }, { status: 400 });
    }

    // 인증된 사용자 확인
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 서비스 롤 클라이언트 생성
    const serviceClient = createServiceClient();

    // 1. 먼저 places 테이블에서 refreshId에 해당하는 매장 정보 가져오기
    const { data: placeData, error: placeError } = await serviceClient
      .from('places')
      .select('id, place_id, place_name, place_url, remaining_refreshes, user_id, status')
      .eq('id', placeId)
      .single();

    if (placeError) {
      console.error('[refresh-place] 매장 정보 조회 중 오류:', placeError);
      return NextResponse.json({ error: '매장 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 사용자가 해당 매장의 소유자인지 확인
    if (placeData.user_id !== user.id) {
      return NextResponse.json({ error: '해당 매장에 대한 권한이 없습니다.' }, { status: 403 });
    }

    // 3. 남은 새로고침 횟수 확인
    if (placeData.remaining_refreshes <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: '오늘의 새로고침 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.',
        },
        { status: 400 }
      );
    }

    // 4. 구독 상태 확인
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[refresh-place] 프로필 정보 조회 중 오류:', profileError);
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (profileData.subscription_tier === 'free') {
      return NextResponse.json(
        {
          success: false,
          message: '구독 사용자만 매장 정보 새로고침이 가능합니다.',
        },
        { status: 400 }
      );
    }

    // 5. 상태를 processing으로 변경
    const { error: updateStatusError } = await serviceClient
      .from('places')
      .update({ status: 'processing' })
      .eq('id', placeId);

    if (updateStatusError) {
      console.error('[refresh-place] 상태 업데이트 중 오류:', updateStatusError);
      return NextResponse.json(
        { error: '매장 상태 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Firecrawl API 키 확인
    if (!firecrawlApiKey) {
      console.error(`[API Setup Error] Firecrawl API 키가 설정되지 않았습니다.`);

      // 실패 시 상태 업데이트
      await serviceClient
        .from('places')
        .update({
          status: 'completed',
          error_message: 'URL 정보 수집 서비스 설정 오류입니다. 관리자에게 문의하세요.',
        })
        .eq('id', placeId);

      return NextResponse.json(
        { error: 'URL 정보 수집 서비스 설정 오류입니다. 관리자에게 문의하세요.' },
        { status: 503 }
      );
    }

    try {
      // 6. Firecrawl API를 사용하여 매장 정보 크롤링
      const naverPlaceId = placeData.place_id;
      const standardizedUrlForFirecrawl = `https://m.place.naver.com/restaurant/${naverPlaceId}/home`;

      console.log(`[Firecrawl] 매장 정보 새로고침 시작: ${standardizedUrlForFirecrawl}`);

      let firecrawlData;
      try {
        firecrawlData = await crawlWithFirecrawl(standardizedUrlForFirecrawl);
        console.log(`[Firecrawl] 매장 정보 수집 완료`);
      } catch (error) {
        console.error(`[Firecrawl] 크롤링 실패:`, error);

        // 실패 시 상태 업데이트
        await serviceClient
          .from('places')
          .update({
            status: 'completed',
            error_message: error instanceof Error ? error.message : '크롤링 중 오류 발생',
          })
          .eq('id', placeId);

        return NextResponse.json(
          {
            success: false,
            message: '매장 정보 새로고침 중 오류가 발생했습니다.',
          },
          { status: 500 }
        );
      }

      // 매장 상태 업데이트 (crawled_data는 Edge Function에서 업데이트)
      const { error: updateDataError } = await serviceClient
        .from('places')
        .update({
          last_crawled_at: new Date().toISOString(),
          // 아직 remaining_refreshes를 차감하지 않음 - AI 분석 성공 후에만 차감
          status: 'processing', // 상태를 processing으로 변경
        })
        .eq('id', placeId);

      if (updateDataError) {
        console.error(`[Firecrawl] 매장 상태 업데이트 중 오류:`, updateDataError);
        // 저장 오류가 있어도 진행 (AI 분석은 시도)
      } else {
        console.log(`[Firecrawl] 매장 상태 업데이트 완료: ${placeId}`);
      }

      // 7. AI 분석을 위한 Edge Function 호출 (register-or-get과 유사)
      const { error: functionError } = await serviceClient.functions.invoke('process-ai-analysis', {
        body: {
          place_pk_id: placeId,
          firecrawl_markdown: firecrawlData.markdown,
          firecrawl_metadata: firecrawlData.metadata,
          is_refresh: true, // 새로고침임을 알림
        },
      });

      if (functionError) {
        console.error(
          `[Edge Function] Invoke failed for 'process-ai-analysis', place_pk_id ${placeId}:`,
          functionError
        );

        // 오류 메시지에서 Gemini API 오류인지 확인
        const errorMessage = functionError.message || '';
        const isGeminiApiError =
          errorMessage.includes('GoogleGenerativeAI Error') ||
          errorMessage.includes('generativelanguage.googleapis.com');

        // 상태 업데이트 메시지 구성
        const statusMessage = isGeminiApiError
          ? '일시적인 AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.'
          : `Edge Function 호출 실패: ${functionError.message}`;

        // Edge Function 호출 실패 시 상태 업데이트 (횟수 차감 없음)
        await serviceClient
          .from('places')
          .update({
            status: 'completed',
            error_message: statusMessage,
            // remaining_refreshes는 차감하지 않음 (AI 분석 실패)
          })
          .eq('id', placeId);

        return NextResponse.json(
          {
            success: false,
            message: isGeminiApiError
              ? '일시적인 AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.'
              : '매장 정보 수집은 완료되었으나 AI 분석 중 오류가 발생했습니다.',
            remainingRefreshes: placeData.remaining_refreshes, // 차감되지 않은 횟수 반환
          },
          { status: 202 }
        );
      }

      // 8. 성공적으로 Edge Function 호출한 경우 (AI 분석은 백그라운드에서 진행)
      // AI 분석 성공 시에만 새로고침 횟수 차감
      const { error: updateRefreshesError } = await serviceClient
        .from('places')
        .update({
          remaining_refreshes: placeData.remaining_refreshes - 1, // AI 분석 성공 시 횟수 차감
        })
        .eq('id', placeId);

      if (updateRefreshesError) {
        console.error(`[AI Analysis Success] 새로고침 횟수 차감 중 오류:`, updateRefreshesError);
      } else {
        console.log(`[AI Analysis Success] 새로고침 횟수 차감 완료: ${placeId}`);
      }

      // 새로고침 로그 기록
      await serviceClient.from('place_refresh_logs').insert({
        place_id: placeId,
        user_id: user.id,
        refreshed_at: new Date().toISOString(),
        is_successful: true,
      });

      // 성공 응답
      return NextResponse.json({
        success: true,
        message: `${placeData.place_name} 매장 정보 새로고침을 완료했습니다.`,
        remainingRefreshes: placeData.remaining_refreshes - 1, // 차감된 횟수 반환
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('[refresh-place] 크롤링 중 오류:', error);

      // 실패 시 상태 업데이트 (횟수 차감 없음)
      await serviceClient
        .from('places')
        .update({
          status: 'completed',
          error_message: `매장 정보 새로고침 중 오류: ${errorMsg}`,
          // remaining_refreshes는 차감하지 않음 (오류 발생)
          last_crawled_at: new Date().toISOString(),
        })
        .eq('id', placeId);

      // 실패 기록
      await serviceClient.from('place_refresh_logs').insert({
        place_id: placeId,
        user_id: user.id,
        refreshed_at: new Date().toISOString(),
        is_successful: false,
      });

      return NextResponse.json(
        {
          success: false,
          message: '매장 정보 새로고침 중 오류가 발생했습니다.',
          remainingRefreshes: placeData.remaining_refreshes, // 차감되지 않은 횟수 반환
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('[refresh-place] 매장 새로고침 중 예외 발생:', error);
    const message =
      error instanceof Error
        ? error.message
        : '매장 정보 새로고침 중 알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
