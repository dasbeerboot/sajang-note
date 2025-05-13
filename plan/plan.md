# 사장노트 MVP 프로젝트 기획서 (v0.3)

## 1. 프로젝트 개요

- **목적**: 자영업자 대상 '네이버 플레이스 기반 마케팅 콘텐츠 자동 생성' 서비스 MVP를 구축한다.
- **방식**: 플레이스 URL만 입력하면 다양한 마케팅 콘텐츠(당근 광고, 파워링크 등)를 AI로 자동 생성하는 서비스를 제공한다.
- **주요 KPI**

| 지표                  | 목표치 |
| --------------------- | ------ |
| 방문→URL 입력률       | ≥ 30 % |
| URL 입력→생성 완료율  | ≥ 80 % |
| 연락처 수집률         | ≥ 40 % |
| 가격 문의 버튼 클릭률 | ≥ 15 % |

- **실험 기간**: 2주 (트래픽 약 300 명 확보 가정)

## 2. 대상 사용자

- **1차 타깃**: 오프라인 매장을 운영하는 자영업자(음식·뷰티·교육 등)
- **페르소나 예시**: "30대 중반, 개인카페 사장, 마케팅 콘텐츠 제작에 어려움을 겪고 있음."

## 3. 핵심 메시지 & 카피라이팅

- **헤드라인(H1)** : "플레이스 URL 하나로 모든 마케팅 콘텐츠 자동 생성" (48 px / 700)
- **서브헤드라인** : "당근 광고부터 파워링크까지 AI가 알아서" (18 px / 400)
- **CTA 문구** : "무료로 생성하기"

## 4. 기능 스코프 (MVP)

1. **히어로 섹션**
   - 플레이스 URL 입력 필드
   - CTA 버튼
2. **소셜프루프 & 특징 섹션**
   - 카드형 아이콘 3개 (플레이스 분석 / 알림톡 / AI 마케팅 피드백)
3. **콘텐츠 생성 결과 섹션**
   - 당근 광고 제목
   - 당근 소식
   - 파워링크 문구
   - 플레이스 문구
   - 쓰레드 포스팅
4. **회원가입 & 인증**
   - 이메일 회원가입
   - 휴대폰 인증 (SMS 인증번호)
   - 사용자 상태 관리 (인증 완료 여부)
5. **마이크로인터랙션**
   - Input focus: border-color `#00E0FF` + box‑shadow `rgba(0,224,255,.25)`
   - CTA hover: translate‑y -2px, scale 1.03, shadow‑xl `rgba(255,92,222,0.4)`

## 5. UI / UX 가이드

### 컬러 팔레트 (Arc Browser 스타일)

> **daisy ui theme**

@plugin "daisyui/theme" {
name: "dark";
default: false;
prefersdark: false;
color-scheme: "dark";
--color-base-100: oklch(25.33% 0.016 252.42);
--color-base-200: oklch(23.26% 0.014 253.1);
--color-base-300: oklch(21.15% 0.012 254.09);
--color-base-content: oklch(97.807% 0.029 256.847);
--color-primary: #3238FB;
--color-primary-content: oklch(96% 0.018 272.314);
--color-secondary: oklch(65% 0.241 354.308);
--color-secondary-content: oklch(94% 0.028 342.258);
--color-accent: oklch(77% 0.152 181.912);
--color-accent-content: oklch(38% 0.063 188.416);
--color-neutral: oklch(14% 0.005 285.823);
--color-neutral-content: oklch(92% 0.004 286.32);
--color-info: oklch(74% 0.16 232.661);
--color-info-content: oklch(29% 0.066 243.157);
--color-success: oklch(76% 0.177 163.223);
--color-success-content: oklch(37% 0.077 168.94);
--color-warning: oklch(82% 0.189 84.429);
--color-warning-content: oklch(41% 0.112 45.904);
--color-error: oklch(71% 0.194 13.428);
--color-error-content: oklch(27% 0.105 12.094);
--radius-selector: 0.5rem;
--radius-field: 0.25rem;
--radius-box: 0.5rem;
--size-selector: 0.25rem;
--size-field: 0.25rem;
--border: 1px;
--depth: 1;
--noise: 0;
}

@plugin "daisyui/theme" {
name: "light";
default: false;
prefersdark: false;
color-scheme: "light";
--color-base-100: oklch(98% 0.003 247.858);
--color-base-200: oklch(98% 0 0);
--color-base-300: oklch(95% 0 0);
--color-base-content: oklch(21% 0.006 285.885);
--color-primary: #3238FB;
--color-primary-content: oklch(93% 0.034 272.788);
--color-secondary: oklch(65% 0.241 354.308);
--color-secondary-content: oklch(94% 0.028 342.258);
--color-accent: oklch(77% 0.152 181.912);
--color-accent-content: oklch(38% 0.063 188.416);
--color-neutral: oklch(14% 0.005 285.823);
--color-neutral-content: oklch(92% 0.004 286.32);
--color-info: oklch(74% 0.16 232.661);
--color-info-content: oklch(29% 0.066 243.157);
--color-success: oklch(76% 0.177 163.223);
--color-success-content: oklch(37% 0.077 168.94);
--color-warning: oklch(82% 0.189 84.429);
--color-warning-content: oklch(41% 0.112 45.904);
--color-error: oklch(71% 0.194 13.428);
--color-error-content: oklch(27% 0.105 12.094);
--radius-selector: 0.5rem;
--radius-field: 0.25rem;
--radius-box: 0.5rem;
--size-selector: 0.25rem;
--size-field: 0.25rem;
--border: 1px;
--depth: 1;
--noise: 0;
}

### 타이포그래피

- **H1** 48 px / 700
- **Body** 18 px / 400, line-height 1.5

### 마이크로인터랙션

- **Input focus**: border-color `#00E0FF` + box‑shadow `rgba(0,224,255,.25)`
- **CTA hover**: translate‑y -2px, scale 1.03, shadow‑xl `rgba(255,92,222,0.4)`

## 6. 기술 스택

| 계층                   | 선택 기술                                                      | 메모                                                              |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Frontend               | **Next.js 14**, **TypeScript**, **Tailwind CSS**, **daisy ui** | Hero + Form 컴포넌트 제작, dark 와 light모드 토글 가능하도록 제작 |
| Backend                | **Supabase Edge Function** (TypeScript)                        | 폼 제출 Logging & DB Insert                                       |
| API 통합               | **Firecrawl API**                                              | 네이버 플레이스 정보 수집                                         |
| AI 생성                | **OpenAI API** 또는 **Gemini API**                             | 수집된 정보를 바탕으로 마케팅 콘텐츠 생성                         |
| Auth                   | **Supabase Auth** (TypeScript)                                 | 이메일 회원가입, 휴대폰 SMS 인증                                  |
| **Google Sheets 연동** | **Google Sheets API v4** (Service Account)                     | leads 데이터를 `Leads` 시트에 실시간 Append                       |
| DB                     | Supabase PostgreSQL                                            | 사용자 정보, 생성된 콘텐츠 저장                                   |
| Messaging              | **카카오 알림톡 (Solapi)**                                     | 콘텐츠 생성 완료 알림 및 SMS 인증번호 발송                        |
| Analytics              | Vercel Web Analytics + Mixpanel                                | 사용자 행동 및 전환 측정                                          |
| Deploy                 | **Vercel**                                                     | 배포 및 환경 관리                                                 |

## 7. 데이터 모델

```sql
CREATE TABLE leads (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text NOT NULL,
  phone           text NOT NULL,
  email           text NOT NULL,
  place_url       text NOT NULL,
  created_at      timestamp DEFAULT now()
);

CREATE TABLE generated_contents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         uuid REFERENCES leads(id),
  place_url       text NOT NULL,
  place_data      jsonb,                -- Firecrawl API 응답 데이터
  carrot_title    text,                 -- 당근 광고 제목
  carrot_content  text,                 -- 당근 소식 내용
  powerlink       text,                 -- 파워링크 문구
  place_desc      text,                 -- 플레이스 문구
  thread_post     text,                 -- 쓰레드 포스팅
  created_at      timestamp DEFAULT now()
);

CREATE TABLE verification_codes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone           text NOT NULL,
  code            text NOT NULL,
  used            boolean DEFAULT false,
  expires_at      timestamp NOT NULL,
  created_at      timestamp DEFAULT now()
);
```

## 8. 작동 흐름

1. **사용자 입력**: 네이버 플레이스 URL 입력
2. **데이터 수집**: Firecrawl API를 통해 플레이스 정보 수집 (메뉴, 가격, 리뷰 등)
3. **AI 콘텐츠 생성**:
   - OpenAI 또는 Gemini API에 수집된 정보 전달
   - 각 플랫폼별 최적화된 마케팅 콘텐츠 생성 요청
4. **결과 표시**: 생성된 콘텐츠를 사용자에게 표시
5. **사용자 정보 수집**: 베타 신청 모달을 통해 연락처 정보 수집
6. **회원가입 & 인증 흐름**:
   - 이메일 회원가입 (이름, 이메일, 비밀번호, 휴대폰번호 입력)
   - SMS 인증번호 발송
   - 인증번호 확인 및 계정 활성화

## 9. 개인정보·법적 준수

- 개인정보보호법 14조 동의 체크박스 추가
- 광고성 정보 수신 동의 문구 분리
- SMS 인증번호 발송 시 개인정보 수집 동의 확인

## 10. 일정 (D+0 기준)

| 일자    | 작업                                      | 담당  |
| ------- | ----------------------------------------- | ----- |
| D+0     | 기획서 확정, API 연동 계획 수립           | PO    |
| D+3     | UI 개발 완료                              | FE    |
| D+5     | Firecrawl API 연동                        | BE    |
| D+6     | 회원가입 & SMS 인증 기능 구현             | BE    |
| D+7     | OpenAI/Gemini API 연동 및 프롬프트 최적화 | BE/AI |
| D+9     | QA / 모바일 반응형                        | 전원  |
| D+10    | 배포 & 인하우스 테스트                    | FE/BE |
| D+11~21 | 서비스 운영, 데이터 수집                  | PO    |
| D+22    | KPI 분석·결과 보고 & 개선점 도출          | PO    |

## 11. 후속 과제

- 생성된 콘텐츠 품질 개선 및 프롬프트 최적화
- 추가 마케팅 채널 지원 (인스타그램, 블로그 등)
- 사용자 피드백 기반 AI 모델 학습 및 개선
- 유료 구독 모델 설계 및 결제 시스템 구축
- 소셜 로그인 (카카오, 구글) 추가
