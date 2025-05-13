# 기획서: 매장 상세 페이지 및 AI 카피 생성 기능

## 1. 개요

사용자가 등록한 매장의 상세 정보를 확인하고, 해당 정보를 기반으로 다양한 마케팅 플랫폼을 위한 광고 카피를 AI를 통해 생성하는 기능입니다. `/[placeId]` 동적 라우트 페이지를 통해 접근합니다.

## 2. UI/UX 디자인 (`/[placeId]` 페이지)

전체적으로 DaisyUI 컴포넌트를 활용하여 기존 서비스의 톤앤매너를 유지합니다.

### 2.1. 매장 정보 요약 섹션

- **위치 및 크기:** 페이지 상단에 위치하며, 화면 세로 길이의 약 1/3 또는 1/4 정도를 차지합니다.
- **구성:**
  - **대표 이미지:** `crawled_data.basic_info.representative_images` 중 첫 번째 이미지를 사용하거나, 사용자가 선택할 수 있는 캐러셀 형태로 제공 (선택 사항).
  - **매장명:** `crawled_data.basic_info.place_name` (크고 명확하게 표시).
  - **핵심 정보:**
    - **한 줄 요약 (AI 생성):** `crawled_data.detailed_info.description`의 일부 또는 별도 생성된 요약 (필요시).
    - **주소:** `crawled_data.basic_info.place_address`.
    - **전화번호:** `crawled_data.basic_info.phone_number`.
    - **영업시간 (간략히):** `crawled_data.detailed_info.opening_hours_raw` 또는 구조화된 정보 중 현재 상태.
    - **대표 키워드 (3-5개):** `crawled_data.review_analysis.positive_keywords_from_reviews` 또는 `crawled_data.detailed_info.atmosphere_keywords` 등에서 추출.
  - **액션 버튼:**
    - `플레이스 새로고침 (정보 재크롤링)` 버튼: 매장당 일 3회 제한 (기존 규칙 따름). 클릭 시 `/api/places/[placeId]/refresh-crawl` 호출.
    - `플레이스 URL 변경` 버튼: 각 매장 슬롯별 7일에 한 번 (최초 등록 후 1회 즉시 가능) (기존 규칙 따름). 클릭 시 `/api/places/[placeId]/url` 관련 로직 수행 (UI는 별도 페이지 또는 모달).
    - (선택) `정보 상세보기` 버튼: `crawled_data`의 모든 내용을 볼 수 있는 별도 모달 또는 확장 섹션.
- **디자인:** DaisyUI의 `Card` 컴포넌트나 커스텀 레이아웃을 사용하여 깔끔하고 정보 전달력이 높도록 디자인합니다.

### 2.2. AI 카피 생성 메뉴 섹션

- **위치:** 매장 정보 요약 섹션 하단.
- **형태:** 각 카피 종류별 버튼 목록. 반응형 그리드 레이아웃 사용.
- **버튼 목록 (예시):**
  - `당근 광고 제목 생성`
  - `당근 소식 작성`
  - `네이버 파워링크 문구 생성`
  - `네이버 플레이스 소개글 생성`
  - `인스타그램 게시물 초안`
  - `스레드 게시물 아이디어`
  - `블로그 포스팅 초안 (일부)`
- **디자인:** DaisyUI의 `Button` 컴포넌트 사용. 각 버튼에는 아이콘을 추가하여 시각적 구분 용이 (선택 사항).

## 3. AI 카피 생성 프로세스

### 3.1. 사용자 특이사항 입력

1.  사용자가 AI 카피 생성 메뉴 섹션에서 특정 플랫폼/카피 종류 버튼을 클릭합니다.
2.  **입력 UI 표시:**
    - DaisyUI `Modal` 컴포넌트 또는 페이지 내에 확장되는 입력 폼 섹션을 사용합니다.
    - 안내 문구: "이번에 강조하고 싶은 특장점이나, 강조하고 싶은 부분 혹은 절대 언급하면 안 될 것들 등등 특이사항을 다 적어주세요~ (최대 300자)" (글자 수 제한 필요).
    - 입력 필드: DaisyUI `Textarea` 컴포넌트.
    - 버튼: `생성하기`, `취소`.
3.  사용자가 특이사항을 입력하고 `생성하기` 버튼을 클릭합니다.
4.  입력된 내용은 `userInput` 변수(또는 객체 내 필드)로 저장됩니다. 입력이 없으면 빈 문자열로 처리.

### 3.2. AI 요청 데이터 구성 (프롬프트 엔지니어링)

1.  **`placeData` 준비:**

    - 현재 페이지의 `placeId`를 사용하여 `places` 테이블에서 해당 매장의 `crawled_data` JSON 전체를 가져옵니다.
    - **토큰 수 최적화:** `crawled_data` 전체를 그대로 전달하면 토큰 수를 많이 소모할 수 있습니다. 따라서, 선택된 카피 종류(`copyType`)에 따라 `crawled_data`에서 필요한 핵심 정보만 선별하여 요약하거나, 특정 부분만 추출하여 `placeData` 문자열 또는 JSON 객체로 재구성하는 전처리 과정이 필요할 수 있습니다. (예: 메뉴 정보, 핵심 키워드, AI 생성 설명 등)

2.  **플랫폼별/카피 종류별 기본 프롬프트 조회:**

    - `prompts` 테이블에서 `copyType`에 해당하는 프롬프트 (예: `copy_generation_danggn_title`, `copy_generation_instagram_post`)를 조회합니다.
    - 각 프롬프트는 해당 플랫폼의 특성, 글자 수 제한, 톤앤매너 가이드라인 등을 포함해야 합니다.

3.  **최종 프롬프트 조합:**

    - 조회한 기본 프롬프트 템플릿에 `placeData`(선별/요약된 매장 정보)와 사용자가 입력한 `userInput`을 조합하여 최종 프롬프트를 완성합니다.
    - **프롬프트 구조 예시:**

      ```
      [선택된 플랫폼/카피 종류에 최적화된 상세 지침 및 역할 부여]

      **매장 분석 정보:**
      {placeData_summary}
      // 예: "매장명: OOO, 주요 메뉴: AAA, BBB, 분위기: 아늑함, 주 고객층: 20대 여성, 최근 이벤트: 할인 행사" 등
      // crawled_data를 AI가 이해하기 쉬운 형태로 요약/정리한 내용

      **사용자 요청사항 (절대적으로 지켜야 할 사항):**
      {userInput}
      // 사용자가 입력한 특이사항. 없으면 "특이사항 없음" 또는 생략.

      **생성 목표:**
      - 카피 종류: {copyType_description} (예: 당근마켓 중고거래 스타일의 광고 제목)
      - 핵심 타겟: {target_audience_suggestion} (예: 20-30대 자취생)
      - 포함할 내용: {key_selling_points_from_placeData} (예: 신선한 재료, 빠른 배달)
      - 제외할 내용: (userInput에서 언급된 내용)
      - 글자 수/스타일: (플랫폼별 가이드라인)
      - (기타 플랫폼별 구체적인 요구사항)

      위 정보를 바탕으로 [요청된 카피 종류]에 대한 [요청 개수]개의 광고 카피를 생성해주세요.
      ```

    - 실제 프롬프트는 각 `copyType`별로 매우 구체적이고 상세하게 작성되어야 합니다.

### 3.3. AI 카피 생성 API (`/api/generate-copy`) 호출

1.  **요청 (Request):**
    - HTTP 메소드: `POST`
    - Endpoint: `/api/generate-copy`
    - Request Body:
      ```json
      {
        "placePkId": "string", // places 테이블의 PK (crawled_data 조회를 위함)
        "copyType": "string", // 예: "danggn_title", "insta_post", "blog_intro"
        "userInput": "string" // 사용자가 입력한 특이사항
      }
      ```
2.  **처리 (Server-side: Next.js API Route):**
    - 사용자 인증 확인.
    - `placePkId`로 `places` 테이블에서 `crawled_data` 조회.
    - `copyType`에 해당하는 프롬프트 템플릿을 `prompts` 테이블에서 조회.
    - `crawled_data`와 `userInput`을 조합하여 최종 프롬프트 생성 (위 3.2.3 참고).
    - Gemini API (또는 다른 LLM) 호출하여 카피 생성 요청.
      - AI 응답이 여러 개일 경우, 또는 다양한 스타일을 요청할 경우 처리 방안 고려.
    - API 응답 시간 고려: AI 생성 시간이 길어질 수 있으므로, 사용자에게 로딩 상태를 명확히 보여주고, 필요시 타임아웃 처리 또는 백그라운드 처리 후 알림 방식 고려 (초기에는 동기 처리로 구현 후, 성능에 따라 개선). Vercel Pro 플랜의 경우 서버리스 함수 실행 시간 연장 가능.
3.  **응답 (Response):**
    - 성공 시 (HTTP 200):
      ```json
      {
        "success": true,
        "generated_copies": [
          { "id": 1, "text": "생성된 카피 1..." },
          { "id": 2, "text": "생성된 카피 2..." }
          // 여러 개 생성 시 배열, 단일 생성이면 객체 또는 단일 문자열도 가능
        ],
        "model_used": "gemini-1.5-flash-latest", // 사용된 AI 모델 정보 (선택 사항)
        "prompt_tokens": 1200, // (선택 사항)
        "completion_tokens": 350 // (선택 사항)
      }
      ```
    - 실패 시 (HTTP 4xx, 5xx):
      ```json
      {
        "success": false,
        "error": "카피 생성 중 오류가 발생했습니다.",
        "details": "AI 모델 응답 오류 또는 타임아웃 등"
      }
      ```

### 3.4. 결과 표시 및 활용

1.  API 응답으로 받은 생성된 카피들을 UI에 표시합니다.
    - DaisyUI `Card` 또는 `Alert` 컴포넌트 등을 활용하여 각 카피를 구분하여 보여줍니다.
2.  **사용자 액션:**
    - **복사 버튼:** 각 카피 옆에 제공하여 사용자가 쉽게 클립보드로 복사할 수 있도록 합니다.
    - **(선택) 수정 기능:** 생성된 카피를 사용자가 직접 수정할 수 있는 간단한 편집기 제공.
    - **(선택) 다시 생성 버튼:** 동일한 조건 또는 수정된 조건으로 다시 생성을 요청하는 기능.
    - **(선택) 저장 기능:** 마음에 드는 카피를 사용자가 저장할 수 있는 기능 (별도 DB 테이블 필요).

## 4. 데이터 흐름 요약

1.  **페이지 진입:** `/[placeId]` -> `getServerSideProps` 또는 클라이언트 사이드 fetch를 통해 `placeId`로 `places` 테이블 조회 -> `crawled_data` 및 기본 매장 정보 state에 저장 -> UI 렌더링.
2.  **카피 생성 요청:** 사용자 메뉴 선택 및 특이사항 입력 -> `userInput`과 `copyType`, `placeId`를 `/api/generate-copy`로 POST 요청.
3.  **API 처리:** `/api/generate-copy`에서 `placeId`로 `crawled_data` 조회, `copyType`으로 프롬프트 조회 -> 최종 프롬프트 구성 -> Gemini API 호출 -> 결과 수신.
4.  **결과 반환 및 표시:** API가 생성된 카피 반환 -> 클라이언트에서 수신하여 UI에 표시.

## 5. API 엔드포인트 상세 정의

### 5.1. `GET /api/places/[placePkId]`

- **목적:** 특정 매장의 상세 정보 (주로 `crawled_data`)를 조회합니다. `/[placeId]` 페이지에서 사용됩니다.
- **요청 파라미터:** `placePkId` (경로 파라미터)
- **성공 응답 (200):**
  ```json
  {
    "id": "uuid",
    "place_id": "string", // 네이버 플레이스 ID
    "place_name": "string",
    "place_address": "string",
    "place_url": "string",
    "status": "completed" | "processing" | "failed",
    "crawled_data": { /* AI가 분석/저장한 전체 JSON 데이터 */ },
    "error_message": "string | null",
    "content_last_changed_at": "timestamp",
    "last_crawled_at": "timestamp"
    // ... 기타 필요한 places 테이블 컬럼
  }
  ```
- **실패 응답 (404):** 매장 정보를 찾을 수 없음.

### 5.2. `POST /api/generate-copy`

- **목적:** AI를 통해 마케팅 카피를 생성합니다.
- **Request Body:** (3.3.1. 요청 참고)
  ```json
  {
    "placePkId": "string",
    "copyType": "string",
    "userInput": "string"
  }
  ```
- **성공 응답 (200):** (3.3.3. 성공 응답 참고)
- **실패 응답 (400, 401, 403, 500 등):** (3.3.3. 실패 응답 참고)

## 6. 데이터베이스 고려사항

### 6.1. `prompts` 테이블 활용

- **용도:** `place_data_extraction_default` 외에, 각 플랫폼/카피 종류별 기본 프롬프트를 저장합니다.
- **`prompt_name` 예시:**
  - `copy_danggn_title_v1`
  - `copy_danggn_post_v1`
  - `copy_powerlink_ad_v1`
  - `copy_insta_post_caption_v1`
  - `copy_blog_intro_v1`
- **`prompt_content`:** 각 프롬프트에는 `{placeData_summary}`와 `{userInput}` 플레이스홀더 및 해당 플랫폼에 최적화된 상세 지침이 포함됩니다.

### 6.2. (선택) `generated_copies` 테이블 신규 생성

- **목적:** 사용자가 생성하고 만족한 카피를 저장하거나, 생성 이력을 관리할 경우 필요합니다. (초기 MVP에서는 구현하지 않을 수 있음)
- **컬럼 예시:**
  - `id` (PK)
  - `user_id` (FK, `profiles.id`)
  - `place_id` (FK, `places.id`)
  - `copy_type` (text, 예: "danggn_title")
  - `generated_text` (text, 생성된 카피)
  - `user_input_snapshot` (text, 생성 당시 사용자 입력)
  - `prompt_name_used` (text, 사용된 프롬프트 이름)
  - `is_favorite` (boolean, 사용자가 즐겨찾기 했는지)
  - `created_at`

## 7. 기술 스택 (언급된 내용 기반)

- **Frontend:** Next.js (App Router 또는 Pages Router), React, TypeScript, DaisyUI
- **Backend (API Routes):** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Background Jobs/AI Processing:** Supabase Edge Functions
- **Crawling:** Firecrawl API
- **AI Model:** Google Gemini API (구체적인 모델은 `GEMINI_MODEL_NAME` 환경 변수 따름)

## 8. 향후 확장 가능성

- 생성된 카피에 대한 사용자 평가(좋아요/싫어요) 및 피드백 수집 기능.
- 피드백을 바탕으로 프롬프트 자동 개선 또는 사용자 맞춤형 프롬프트 제안.
- 다양한 AI 모델 선택 기능 제공 및 A/B 테스트.
- 생성된 카피의 수정 및 버전 관리 기능.
- 카피 생성 횟수 제한 (구독 등급별).
- 팀 기능: 팀원이 함께 매장 정보를 관리하고 카피를 생성/공유.
