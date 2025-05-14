/**
 * 크롤링 결과 처리 및 파싱 유틸리티
 */

interface CrawlContent {
  markdown: string;
  metadata: Record<string, unknown>;
}

interface ParsedContent {
  title: string;
  author?: string;
  url: string;
  content: string;
  summary?: string;
}

/**
 * 크롤링 결과에서 필요한 정보를 추출하고 정제
 * @param content 크롤링된 콘텐츠 객체
 * @param url 원본 URL
 * @returns 파싱된 콘텐츠 객체
 */
export function parseContent(content: CrawlContent, url: string): ParsedContent {
  if (!content || !content.markdown) {
    throw new Error('유효한 크롤링 콘텐츠가 아닙니다.');
  }

  const { markdown, metadata } = content;

  // 메타데이터에서 제목과 작성자 추출
  const title = typeof metadata.ogTitle === 'string' ? metadata.ogTitle : 
                typeof metadata.title === 'string' ? metadata.title : '제목 없음';
                
  const author = typeof metadata['naverblog:nickname'] === 'string' ? metadata['naverblog:nickname'] : 
                typeof metadata.author === 'string' ? metadata.author : undefined;

  // 마크다운 내용 정제
  const cleanedContent = cleanMarkdownContent(markdown);

  return {
    title,
    author,
    url,
    content: cleanedContent,
    summary: typeof metadata.ogDescription === 'string' ? metadata.ogDescription : 
             typeof metadata.description === 'string' ? metadata.description : undefined,
  };
}

/**
 * 마크다운 내용에서 불필요한 요소 제거
 * @param markdown 원본 마크다운 텍스트
 * @returns 정제된 마크다운 텍스트
 */
function cleanMarkdownContent(markdown: string): string {
  if (!markdown) return '';

  let cleanedContent = markdown;

  // HTML 태그 제거 (특히 <br> 태그)
  cleanedContent = removeHtmlTags(cleanedContent);

  // 네비게이션, 메뉴, 광고 등 불필요한 부분 제거
  cleanedContent = removeNavigation(cleanedContent);

  // 테이블 정리
  cleanedContent = cleanupTables(cleanedContent);

  // 과도한 공백 및 줄바꿈 제거
  cleanedContent = removeExcessiveWhitespace(cleanedContent);

  // 텍스트가 너무 길면 적절히 자르기
  const MAX_LENGTH = 4000; // 적절한 토큰 제한 고려
  if (cleanedContent.length > MAX_LENGTH) {
    cleanedContent = cleanedContent.substring(0, MAX_LENGTH) + '...';
  }

  return cleanedContent;
}

/**
 * HTML 태그를 제거하는 함수
 */
function removeHtmlTags(content: string): string {
  // <br> 태그를 줄바꿈으로 대체 (이후 줄바꿈 정리 과정에서 처리됨)
  let result = content.replace(/<br\s*\/?>/gi, '\n');

  // 모든 HTML 태그 제거
  result = result.replace(/<[^>]*>/g, '');

  // HTML 엔티티 변환
  result = result
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return result;
}

/**
 * 테이블 형식 마크다운을 정리하는 함수
 */
function cleanupTables(content: string): string {
  // 마크다운 테이블 형식 간소화 (| --- | 형태의 구분선과 비어있는 셀 정리)
  let result = content.replace(/\|\s*---\s*\|/g, '');
  result = result.replace(/\|\s*\|\s*\|/g, '');
  result = result.replace(/\|\s*\|/g, '');

  // 테이블 헤더와 행 구분자 제거
  result = result.replace(/\|[\s-]*\|[\s-]*\|/g, '');

  return result;
}

/**
 * 네비게이션, 메뉴 등 불필요한 부분 제거
 */
function removeNavigation(content: string): string {
  // 네이버 블로그 네비게이션 부분 제거 (예시 패턴)
  const patterns = [
    /\[.*?\]\(https?:\/\/.*?\)(\s*!\[\]\(https?:\/\/blogimgs\.pstatic\.net\/nblog\/spc\.gif\))?/g, // 메뉴 링크
    /\[\s*메뉴\s바로가기\s*\][\s\S]*?\[\s*본문\s바로가기\s*\]/g, // 메뉴/본문 바로가기
    /\[\s*로그인\s*\][\s\S]*?\[\s*이웃추가\s*\]/g, // 로그인/이웃추가 영역
    /블로그\s*검색[\s\S]*?이\s*블로그에서\s*검색/g, // 검색 영역
    /즐겨찾는\s*서비스[\s\S]*?전체\s*서비스\s*보기/g, // 서비스 영역
    /^(\s*\[\s*.*?\s*\])+\s*$/gm, // 단순 링크 행
    /확인[\s\S]*?취소[\s\S]*?초기\s*설정으로\s*변경/g, // 확인/취소 버튼
    /(\*\s*\*\s*\*\s*){1,}/g, // 구분선
    /Previous\s*image\s*Next\s*image/g, // 이미지 네비게이션
    /가벼운\s*글쓰기툴\s*퀵에디터가\s*오픈했어요!/g, // 퀵에디터 안내
    /글쓰기/g, // 글쓰기 버튼
    /\d+개의\s*글/g, // 글 개수 표시
    /읽은\s*알림\s*삭제\s*모두\s*삭제/g, // 알림 관련
    /알림을\s*모두\s*삭제하시겠습니까?/g, // 알림 삭제 확인
    /\d+초\s*광고\s*후\s*계속됩니다/g, // 광고 관련
    /재생\s*좋아요\s*좋아요\s*공유하기/g, // 동영상 컨트롤
    /\© NAVER Corp\.?/g, // 네이버 저작권
    /지도\s*데이터/g, // 지도 관련
    /지도\s*컨트롤러\s*범례/g, // 지도 범례
  ];

  let result = content;
  patterns.forEach(pattern => {
    result = result.replace(pattern, '');
  });

  // 마크다운 링크 형식 제거 (ex: [링크텍스트](https://...)
  result = result.replace(/\[([^\]]+)\]\(https?:\/\/[^\)]+\)/g, '$1');

  // 불필요한 각주 제거
  result = result.replace(/\*\*각주\d+\*\*/g, '');

  // 이모티콘 및 특수 마크 제거
  result = result.replace(/!\[.*?\]\(.*?\)/g, '');

  // URL 참조 제거
  result = result.replace(/\]\(https?:\/\/.*?\)/g, '');

  return result;
}

/**
 * 과도한 공백 및 빈 줄 제거
 */
function removeExcessiveWhitespace(content: string): string {
  return content
    .replace(/\n{3,}/g, '\n\n') // 3개 이상의 연속 줄바꿈을 2개로
    .replace(/[ \t]+\n/g, '\n') // 줄 끝 공백 제거
    .replace(/\n[ \t]+/g, '\n') // 줄 시작 공백 제거
    .replace(/[ \t]{2,}/g, ' ') // 2개 이상의 연속 공백을 1개로
    .trim();
}

/**
 * 크롤링된 콘텐츠를 AI 프롬프트용으로 포맷팅
 * @param parsedContents 파싱된 콘텐츠 배열
 * @returns AI 프롬프트에 추가할 텍스트
 */
export function formatForAIPrompt(parsedContents: ParsedContent[]): string {
  if (!parsedContents.length) return '';

  let promptText = '### 참고할 예시 포스팅:\n\n';

  parsedContents.forEach((content, index) => {
    promptText += `#### 참고 자료 ${index + 1}: ${content.title}\n`;
    promptText += `출처: ${content.url}\n`;

    if (content.author) {
      promptText += `작성자: ${content.author}\n`;
    }

    if (content.summary) {
      promptText += `요약: ${content.summary}\n`;
    }

    promptText += `\n${content.content}\n\n`;

    // 구분선 추가 (마지막 항목 제외)
    if (index < parsedContents.length - 1) {
      promptText += '---\n\n';
    }
  });

  return promptText;
}

/**
 * 웹페이지 크롤링을 위한 유틸리티 함수들
 */

// Firecrawl API 키 확인
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
if (!firecrawlApiKey) {
  console.warn('FIRECRAWL_API_KEY is not set. Crawling features will be disabled.');
}

export interface FirecrawlResponse {
  markdown: string;
  metadata: Record<string, unknown>;
}

/**
 * Firecrawl API를 사용하여 주어진 URL의 페이지를 크롤링합니다
 *
 * @param url 크롤링할 URL
 * @returns 크롤링된 마크다운 콘텐츠와 메타데이터
 * @throws 크롤링 실패 시 예외 발생
 */
export async function crawlWithFirecrawl(url: string): Promise<FirecrawlResponse> {
  if (!firecrawlApiKey) {
    console.error(`[API Setup Error] Firecrawl API 키가 설정되지 않았습니다.`);
    throw new Error('URL 정보 수집 서비스 설정 오류입니다. 관리자에게 문의하세요.');
  }

  // 네이버 블로그 URL 감지
  const isNaverBlog = url.includes('blog.naver.com');

  console.log(`[Firecrawl] 페이지 정보 수집 시작: ${url}${isNaverBlog ? ' (네이버 블로그)' : ''}`);
  const firecrawlApiUrl = 'https://api.firecrawl.dev/v1/scrape';

  // API 공식 문서에 맞게 최소한의 옵션만 사용 (https://docs.firecrawl.dev/)
  const payload = {
    url,
    formats: ['markdown'],
    onlyMainContent: isNaverBlog, // 네이버 블로그의 경우 본문만 추출
    excludeTags: ['nav', 'footer', 'script', 'style', 'iframe', 'noscript'],
    waitFor: 3000,
    timeout: 60000,
  };

  try {
    // HTTP 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firecrawlApiKey}`,
    };

    const response = await fetch(firecrawlApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Firecrawl] API Error (${response.status}): ${errorBody}`);

      // 오류 발생 시 간소화된 버전으로 재시도
      if (response.status === 400 || response.status === 403) {
        console.log(`[Firecrawl] API 오류, 기본 설정으로 재시도`);
        return await retryWithBasicSettings(url);
      }

      throw new Error(
        `Firecrawl API 요청 실패 (${response.status}): ${errorBody || response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.success || !result.data || !result.data.markdown || !result.data.metadata) {
      console.error(`[Firecrawl] API 응답 성공했으나 데이터 누락`);
      throw new Error('Firecrawl API에서 유효한 마크다운 또는 메타데이터를 가져오지 못했습니다.');
    }

    console.log(`[Firecrawl] 페이지 정보 수집 완료`);
    return {
      markdown: result.data.markdown,
      metadata: result.data.metadata,
    };
  } catch (error) {
    // 네트워크 오류나 타임아웃의 경우 재시도
    if (
      error instanceof Error &&
      (error.message.includes('timeout') || error.message.includes('network'))
    ) {
      console.log(`[Firecrawl] 네트워크 오류로 재시도`);
      return await retryWithBasicSettings(url);
    }

    throw error;
  }
}

/**
 * 가장 기본적인 설정으로 재시도 (최소 파라미터만 사용)
 */
async function retryWithBasicSettings(url: string): Promise<FirecrawlResponse> {
  console.log(`[Firecrawl] 기본 설정으로 크롤링 재시도: ${url}`);

  const firecrawlApiUrl = 'https://api.firecrawl.dev/v1/scrape';
  // 가장 기본적인 설정만 사용
  const payload = {
    url,
    formats: ['markdown'],
  };

  const response = await fetch(firecrawlApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firecrawlApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Firecrawl] 재시도 실패 (${response.status}): ${errorBody}`);
    throw new Error(
      `Firecrawl API 재시도 실패 (${response.status}): ${errorBody || response.statusText}`
    );
  }

  const result = await response.json();

  if (!result.success || !result.data || !result.data.markdown || !result.data.metadata) {
    throw new Error('Firecrawl API 재시도 시 유효한 데이터를 가져오지 못했습니다.');
  }

  console.log(`[Firecrawl] 기본 설정으로 크롤링 성공`);
  return {
    markdown: result.data.markdown,
    metadata: result.data.metadata,
  };
}
