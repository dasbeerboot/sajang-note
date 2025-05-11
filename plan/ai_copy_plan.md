## ✨ 사장노트: AI 기반 매장별 맞춤 카피 생성 기능 기획안

### 1. 개요

사용자가 자신의 매장 URL을 입력하면, 해당 URL 정보를 기반으로 매장 맞춤형 마케팅 카피(당근, 파워링크, 인스타그램 등) 생성을 도와주는 기능입니다. Firecrawl API를 활용하여 매장 정보를 자동으로 분석하고, 이를 데이터베이스에 저장하여 사용자별 맞춤 서비스를 제공합니다.

### 2. 주요 기능

*   **URL 기반 매장 정보 분석 및 저장**:
    *   사용자가 매장 URL 입력 시 Firecrawl API를 통해 해당 페이지 크롤링.
    *   크롤링된 정보를 바탕으로 매장 이름, 위치, 주요 메뉴, 리뷰 수 등 핵심 정보 추출 및 요약.
    *   추출된 매장 정보를 `places` 테이블에 저장하고, 해당 사용자와 연결.
*   **매장별 대시보드 페이지 (`/[placeId]`)**:
    *   사용자가 등록한 매장별로 고유 페이지 생성.
    *   페이지 상단에 "OO동에서 OO 매장을 운영중이시군요!" 형태의 환영 메시지 및 요약 정보 표시.
    *   추출된 매장의 상세 정보(메뉴, 리뷰, 운영 시간 등) 표시.
    *   매장 URL 변경 기능 제공 (7일에 한 번 변경 가능).
    *   매장 정보 수동 새로고침(재크롤링) 기능 제공 (매장당 일 3회 제한).
*   **AI 카피 생성 메뉴 제공**:
    *   매장 대시보드 페이지 하단에 다양한 플랫폼별 마케팅 카피 생성 메뉴 제공:
        *   당근 광고 (제목, 소식)
        *   네이버 파워링크 문구
        *   네이버 플레이스 소개 문구
        *   인스타그램 포스팅 (사진 업로드 후 캡션 생성)
        *   쓰레드 포스팅
        *   블로그 포스팅 (개요 또는 초안 생성)
*   **프로필 및 구독 플랜 연동**:
    *   사용자는 구독 플랜에 따라 등록 가능한 매장 수가 제한됨 (예: 무료 플랜 1개, Pro 플랜 3개).
    *   `profiles` 테이블의 구독 정보와 연동하여 `places` 테이블 등록/관리.

### 3. 사용자 플로우

1.  **매장 URL 입력 (메인 페이지 또는 매장 관리 페이지)**:
    *   사용자가 매장 URL을 입력.
    *   "카피 생성하기" 또는 "매장 추가하기" 버튼 클릭.
2.  **매장 정보 분석 및 `/[placeId]` 페이지로 이동/처리**:
    *   백엔드에서 `/api/places/register-or-get` API 호출.
    *   API는 사용자 구독 등급, 현재 등록된 매장 수, 입력된 URL의 기존 등록 여부 등을 확인.
        *   **신규 URL이고 등록 가능**: Firecrawl API로 크롤링 -> `places` 테이블에 정보 저장 (이때 `user_id`를 현재 사용자 ID로, `url_last_changed_at`을 현재 시간으로 설정) -> `/[placeId]`로 이동.
        *   **신규 URL이나 등록 한도 초과**: 오류 메시지 표시.
        *   **기존에 현재 사용자가 등록한 URL**: 해당 `placeId`의 대시보드(`/[placeId]`)로 이동.
3.  **매장 대시보드 (`/[placeId]`)**:
    *   크롤링된 매장 정보 요약 (환영 메시지, 주요 정보) 확인.
    *   **매장 URL 변경**:
        *   "매장 URL 변경" 버튼 (또는 아이콘) 클릭.
        *   API (`PUT /api/places/[placeId]/url`) 호출하여 `url_last_changed_at` 기준으로 7일 경과 여부 확인.
        *   변경 가능하면 새 URL 입력받아 저장, Firecrawl로 재크롤링, `places` 정보 및 `url_last_changed_at` 업데이트.
        *   변경 불가 시 남은 기간 등 안내.
    *   **정보 새로고침**:
        *   "정보 새로고침" 버튼 클릭.
        *   API (`POST /api/places/[placeId]/refresh-crawl`) 호출하여 일 3회 제한 확인.
        *   제한 이내면 Firecrawl로 현재 `original_url` 재크롤링, `places` 정보 및 `last_crawled_at` 업데이트, `place_refresh_logs` 기록.
        *   남은 새로고침 횟수 표시.
    *   하단의 다양한 카피 생성 메뉴 중 원하는 항목 선택.
4.  **카피 생성 (각 카피 생성 페이지 또는 모달)**:
    *   선택한 카피 종류에 따라 필요한 추가 정보 입력.
    *   AI가 매장 정보와 추가 입력을 바탕으로 카피 초안 생성.
    *   사용자는 생성된 카피를 확인, 수정, 복사.

### 4. 화면 설계 (간략)

*   **메인 페이지 (`/`) 또는 매장 관리 페이지**:
    *   "내 매장 URL 입력/추가" 폼.
    *   (매장 관리 페이지) 등록된 매장 목록 표시.
*   **매장 대시보드 페이지 (`/[placeId]`)**:
    *   **상단**: "OO동 OO 매장을 운영중이시군요!" + 매장 핵심 정보.
    *   **중단**:
        *   매장 상세 정보 카드 (주소, 전화번호, 현재 URL 등).
        *   "매장 URL 변경" 기능 (예: 아이콘 버튼 + 모달).
        *   "정보 새로고침" 버튼 (남은 횟수 표시).
    *   **하단**: 카피 생성 메뉴 목록.

### 5. 데이터베이스 스키마 변경 제안 (기존 테이블 활용 및 추가)

*   **`places` 테이블 (기존 테이블이라 가정, 필드 확인 후 필요시 추가/수정)**:
    *   `id`: `uuid` (PK, `placeId`로 사용)
    *   `user_id`: `uuid` (FK to `auth.users.id` - **이 매장을 소유/등록한 사용자 ID**)
    *   `name`: `text` (매장 이름, 크롤링 또는 사용자 입력)
    *   `original_url`: `text` (사용자가 입력/수정한 현재 매장의 대표 URL)
    *   `url_last_changed_at`: `timestamp with time zone` (URL 마지막 변경일)
    *   `crawled_data`: `jsonb` (Firecrawl 결과 원본 또는 가공된 정보)
    *   `summary`: `text` (AI 또는 로직으로 생성된 요약 정보)
    *   `address`: `text` (크롤링)
    *   `phone_number`: `text` (크롤링)
    *   `opening_hours`: `jsonb` (크롤링)
    *   `menu_items`: `jsonb` (크롤링)
    *   `review_count`: `integer` (크롤링)
    *   `last_crawled_at`: `timestamp with time zone` (정보 "새로고침" 시간)
    *   `created_at`: `timestamp with time zone` (레코드 생성 시간)
    *   `updated_at`: `timestamp with time zone` (레코드 수정 시간)

*   **`profiles` 테이블 (기존 테이블이라 가정, 필드 확인 후 필요시 추가/수정)**:
    *   `id`: `uuid` (PK, `auth.users.id`와 동일)
    *   `subscription_tier`: `text` (예: 'free', 'pro', 기본값 'free') - 매장 등록 개수 제한에 사용.
    *   `full_name`, `email` 등 기존 프로필 정보.
    *   (*`registered_place_ids`와 같은 배열 필드는 `places.user_id`를 통해 관계를 맺으므로 직접 필요하지 않을 수 있습니다. 특정 사용자의 장소 목록은 `SELECT * FROM places WHERE user_id = auth.uid()` 와 같이 조회합니다.*)

*   **`place_refresh_logs` 테이블 (신규 생성)**:
    *   `id`: `bigint` (PK, auto-increment)
    *   `place_id`: `uuid` (FK to `places.id`)
    *   `user_id`: `uuid` (FK to `auth.users.id` - 새로고침을 실행한 사용자)
    *   `refreshed_at`: `timestamp with time zone` (기본값 `now()`)

### 6. API 엔드포인트 정의 (예시)

*   `POST /api/places/register-or-get`:
    *   Request Body: `{ url: "매장URL" }`
    *   Response: `{ placeId: "...", isNew: boolean, message?: string, errorCode?: string }`
    *   로직:
        1.  요청 보낸 사용자 ID (`auth.uid()`) 가져오기.
        2.  `profiles` 테이블에서 사용자 `subscription_tier` 조회.
        3.  `places` 테이블에서 `user_id`가 현재 사용자인 장소들의 개수 카운트.
        4.  구독 등급별 등록 가능 매장 수(무료 1개, Pro 3개)와 현재 등록된 매장 수 비교.
            *   만약, **입력된 URL과 동일한 `original_url`을 가진 매장이 현재 사용자에 의해 이미 등록되어 있다면**, 해당 `placeId` 반환 (`isNew: false`). (이 경우는 등록 개수 제한 체크 전에 처리)
            *   그렇지 않고, 신규 등록해야 하는데 **등록 한도를 초과했다면**, 오류 응답 (`message`, `errorCode: 'LIMIT_EXCEEDED'`).
        5.  Firecrawl로 URL 크롤링.
        6.  `places` 테이블에 신규 레코드 저장 (`user_id`, `original_url`, `url_last_changed_at`, 크롤링된 정보 등).
        7.  생성된 `placeId` 반환 (`isNew: true`).
*   `PUT /api/places/[placeId]/url`:
    *   Request Body: `{ newUrl: "새로운 매장 URL" }`
    *   Response: `{ success: boolean, message?: string, updatedPlace?: {...} }`
    *   로직:
        1.  `placeId`로 `places` 레코드 조회. `user_id`가 현재 사용자와 일치하는지, 레코드가 존재하는지 확인.
        2.  `url_last_changed_at` 확인하여 7일 경과 여부 체크. 미경과 시 오류.
        3.  Firecrawl로 `newUrl` 크롤링 및 정보 추출.
        4.  `places` 테이블 해당 레코드 업데이트 (`original_url = newUrl`, `url_last_changed_at = now()`, 크롤링된 정보들).
        5.  성공 응답.
*   `POST /api/places/[placeId]/refresh-crawl`:
    *   Response: `{ success: boolean, message?: string, updatedPlace?: {...} }`
    *   로직:
        1.  `placeId`로 `places` 레코드 조회. `user_id`가 현재 사용자와 일치하는지 확인.
        2.  `place_refresh_logs` 테이블에서 오늘 날짜, 해당 `place_id`, 현재 `user_id`로 생성된 로그 카운트.
        3.  카운트가 3회 이상이면 오류 응답.
        4.  Firecrawl로 `places.original_url` 재크롤링 및 정보 추출.
        5.  `places` 테이블 해당 레코드 업데이트 (크롤링된 정보, `last_crawled_at = now()`).
        6.  `place_refresh_logs`에 로그 기록.
        7.  성공 응답.
*   `GET /api/places/[placeId]`:
    *   Response: `{ place: {...}, remainingRefreshesToday: number }`
    *   로직: `places` 정보 조회 및 오늘 남은 새로고침 횟수 계산하여 반환.
*   `GET /api/my-places`:
    *   Response: `[{ id, name, original_url, summary, ... }, ...]`
    *   로직: 현재 로그인한 사용자의 `user_id`로 `places` 테이블에서 등록된 모든 장소 목록 조회.
*   `POST /api/generate-copy`: (기존과 유사)
    *   Request Body: `{ placeId: "...", copyType: "...", userPrompt?: "..." }`
    *   Response: `{ generatedText: "..." }`

---

## 🚀 개발 작업 순서 제안 (규칙 반영)

1.  **데이터베이스 스키마 확인 및 수정 (Supabase)**:
    *   **MCP 도구 사용**: `places`와 `profiles` 테이블의 현재 스키마를 상세히 확인.
    *   **`places` 테이블**:
        *   `user_id (uuid, FK to auth.users.id, not null)` 필드가 있는지, 올바르게 설정되어 있는지 확인/추가.
        *   `url_last_changed_at (timestamp with time zone)` 필드 추가.
        *   `last_crawled_at (timestamp with time zone)` 필드 추가.
        *   나머지 제안된 필드들 (`name`, `original_url`, `crawled_data` 등) 존재 여부 및 타입 확인.
    *   **`profiles` 테이블**:
        *   `subscription_tier (text, default 'free')` 필드가 있는지 확인/추가. (값은 'free', 'pro' 등)
    *   **`place_refresh_logs` 테이블**: 신규 생성 (컬럼: `id`, `place_id`, `user_id`, `refreshed_at`).
    *   필요한 인덱스 추가 (예: `places.user_id`, `place_refresh_logs.place_id`, `place_refresh_logs.user_id`).
    *   RLS 정책 검토 및 설정 (특히 `places` 테이블은 `user_id`를 기준으로 자신의 데이터만 CRUD 가능하도록).
2.  **백엔드 API 개발 (Next.js API Routes)**:
    *   **환경변수 설정**: Firecrawl API 키.
    *   **유틸리티 함수**: Firecrawl API 호출 및 결과 파싱 로직.
    *   API 엔드포인트 구현:
        *   `POST /api/places/register-or-get`
        *   `PUT /api/places/[placeId]/url`
        *   `POST /api/places/[placeId]/refresh-crawl`
        *   `GET /api/places/[placeId]`
        *   `GET /api/my-places`
3.  **프론트엔드 개발 (`src/app`)**:
    *   **메인 페이지 (`/`) 또는 매장 관리 페이지**:
        *   URL 입력 폼 UI 및 `/api/places/register-or-get` 호출 로직.
        *   결과에 따라 `/[placeId]`로 라우팅 또는 오류 메시지 처리.
        *   (매장 관리 페이지) `/api/my-places` 호출하여 목록 표시.
    *   **매장 대시보드 페이지 (`src/app/[placeId]/page.tsx`)**:
        *   페이지 로드 시 `/api/places/[placeId]` 호출하여 데이터 표시.
        *   "매장 URL 변경" UI (모달 등) 및 `PUT /api/places/[placeId]/url` 호출 로직.
        *   "정보 새로고침" 버튼 UI 및 `POST /api/places/[placeId]/refresh-crawl` 호출 로직 (남은 횟수 표시).
        *   카피 생성 메뉴 UI (버튼 형태로, 각 버튼은 나중에 실제 카피 생성 기능으로 연결).
4.  **(다음 단계) AI 카피 생성 기능 구현**:
    *   `POST /api/generate-copy` API 엔드포인트 구현 (LLM 연동).
    *   프론트엔드에서 각 카피 메뉴 선택 시 위 API 호출 및 결과 표시.
5.  **테스트 및 개선**:
    *   기능별 상세 테스트 (경계값, 오류 상황 등 포함).
    *   UI/UX 사용성 검토 및 개선.
