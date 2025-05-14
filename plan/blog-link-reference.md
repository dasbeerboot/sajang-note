# 블로그 링크 참조 기능 구현 계획

## 1. 기능 개요

- 블로그 리뷰 포스팅 생성 시 참고할 웹 링크 최대 3개 입력 기능
- 입력된 링크를 firecrawl API로 크롤링하여 컨텐츠 추출
- 추출된 컨텐츠를 "참고할 예시 포스팅:" 형식으로 AI 프롬프트에 추가

## 2. 기술 스택

- Next.js API Routes: 크롤링 요청 처리
- firecrawl API: 웹 페이지 콘텐츠 추출
- Promise.all: 병렬 크롤링 처리
- React Hook Form: 링크 입력 폼 관리

## 3. 구현 세부 계획

### 3.1 UI 구현

- 블로그 포스팅 생성 폼에 "참고 링크" 입력 필드 추가 (최대 3개)
- 각 링크 입력 필드에 URL 유효성 검사 추가
- 크롤링 진행 중 로딩 상태 표시

### 3.2 API 구현

- `/api/crawl-references` 엔드포인트 생성
- 전달받은 URL 목록을 병렬로 크롤링하는 로직 구현
- firecrawl API 호출 시 `extract_only_main_content=true` 옵션 사용
- 크롤링 결과 캐싱 기능 추가 (동일 URL 재요청 시 성능 향상)

### 3.3 크롤링 결과 파싱

- 크롤링된 JSON 결과에서 필요한 데이터 추출 로직 구현
- markdown 형식 데이터 정제 (불필요한 HTML, 광고, 네비게이션 등 제거)
- 제목과 본문 내용 분리 및 정리
- 메타데이터에서 유용한 정보 추출 (작성자, 날짜, 카테고리 등)

### 3.4 병렬 처리 구현

- Promise.all을 사용하여 여러 URL 동시 크롤링
- 각 크롤링 요청에 타임아웃 설정
- 실패한 크롤링에 대한 예외 처리 및 재시도 로직

### 3.5 AI 프롬프트 통합

- 크롤링 결과를 "참고할 예시 포스팅:" 형식으로 구성
- 각 참고 링크별로 구분자 추가하여 AI가 인식하기 좋게 포맷팅
- 토큰 제한 고려하여 컨텐츠 요약 또는 트리밍 처리

## 4. 오류 처리 계획

- 유효하지 않은 URL 입력 시 사용자 피드백
- 크롤링 실패 시 대체 메시지 및 재시도 옵션
- API 타임아웃 및 서버 에러 처리
- 크롤링 결과가 없거나 부족할 경우 대체 전략

## 5. 성능 최적화

- 이미 크롤링한 URL 결과 캐싱 (Redis 또는 메모리 캐시)
- 크롤링 요청 수 제한 및 사용량 모니터링
- 결과 데이터 압축 및 최적화

## 6. 개발 순서

1. 크롤링 API 엔드포인트 구현 및 테스트
2. 병렬 처리 및 결과 파싱 로직 구현
3. UI 컴포넌트 개발
4. 에러 처리 및 사용자 피드백 개선
5. 성능 테스트 및 최적화
6. 실제 사용 테스트 및 피드백 반영

## 7. 파싱 전략

firecrawl API 응답 (documents_1 (6).json 참고)은 다음과 같은 구조로 파싱:

```javascript
// 1. markdown 필드에서 주요 컨텐츠 추출
const mainContent = crawlResult.markdown;

// 2. 메타데이터에서 유용한 정보 추출
const metaInfo = {
  title: crawlResult.metadata.ogTitle || crawlResult.metadata.title,
  description: crawlResult.metadata.ogDescription || crawlResult.metadata.og.description,
  author: crawlResult.metadata['naverblog:nickname'],
  url: crawlResult.metadata.sourceURL,
};

// 3. 컨텐츠 정제 (불필요한 요소 제거)
const cleanedContent = cleanMarkdownContent(mainContent);

// 4. AI 프롬프트용 포맷팅
const formattedReference = `
### 참고 자료: ${metaInfo.title}
출처: ${metaInfo.url}
작성자: ${metaInfo.author || '알 수 없음'}

${cleanedContent.substring(0, 1500)}... // 토큰 제한 고려하여 적절히 자르기
`;
```

## 8. 예상 일정

- API 및 파싱 로직 구현: 2일
- UI 및 사용자 경험 개발: 1일
- 테스트 및 버그 수정: 1일
- 총 개발 시간: 약 4일
