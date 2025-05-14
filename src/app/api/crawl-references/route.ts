import { NextResponse } from 'next/server';
import { crawlWithFirecrawl, parseContent, formatForAIPrompt } from '@/lib/apis/crawl-utils';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const MAX_URLS = 3; // 최대 URL 개수 제한

interface CrawlRequest {
  urls: string[];
}

/**
 * 웹페이지 크롤링을 위한 API 핸들러
 * 최대 3개의 URL을 병렬로 크롤링하여 결과를 반환
 */
export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const body: CrawlRequest = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: '크롤링할 URL이 필요합니다.' }, { status: 400 });
    }

    // URL 개수 제한
    if (urls.length > MAX_URLS) {
      return NextResponse.json(
        { error: `최대 ${MAX_URLS}개의 URL만 처리할 수 있습니다.` },
        { status: 400 }
      );
    }

    // 유효한 URL 검증
    const validUrls = urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch (_e) {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return NextResponse.json({ error: '유효한 URL이 없습니다.' }, { status: 400 });
    }

    // 사용자 인증 확인
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name) {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 병렬로 모든 URL 크롤링
    console.log(`[크롤링] ${validUrls.length}개의 URL 크롤링 시작`);
    const crawlPromises = validUrls.map(async url => {
      try {
        const crawlResult = await crawlWithFirecrawl(url);
        const parsedResult = parseContent(crawlResult, url);
        return parsedResult;
      } catch (error) {
        console.error(`[크롤링 오류] URL: ${url}`, error);
        // 단일 URL 실패해도 전체 요청 실패하지 않도록 null 반환
        return null;
      }
    });

    // 모든 크롤링 작업 완료 대기
    const results = await Promise.all(crawlPromises);

    // 성공한 결과만 필터링
    const successfulResults = results.filter(result => result !== null);

    if (successfulResults.length === 0) {
      return NextResponse.json({ error: '모든 URL 크롤링에 실패했습니다.' }, { status: 500 });
    }

    // AI 프롬프트용 포맷 생성
    const formattedContent = formatForAIPrompt(successfulResults);

    return NextResponse.json({
      success: true,
      message: `${successfulResults.length}개의 URL이 성공적으로 크롤링되었습니다.`,
      totalAttempted: validUrls.length,
      totalSuccessful: successfulResults.length,
      formattedContent,
      parsedResults: successfulResults,
    });
  } catch (error) {
    console.error('[크롤링 API 오류]', error);
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
