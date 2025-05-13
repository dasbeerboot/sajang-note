# 사장노트 정기결제(빌링) 구현 계획

## 1. 정기결제 로직

### 1.1 개요

정기결제(빌링) 시스템은 고객이 한 번만 카드 정보를 등록하고, 이후 정해진 주기(월간, 연간)에 따라 자동으로 결제가 이루어지는 시스템입니다. 사장노트의 구독 서비스를 위해 나이스페이의 빌링 시스템을 도입합니다.

### 1.2 핵심 개념

#### 빌키(BID)

- 고객의 카드 정보를 안전하게 저장하고 대신하는 암호화된 키
- 실제 카드 번호 대신 이 빌키를 사용하여 결제를 진행
- 카드 정보를 직접 저장하지 않아 보안 강화

### 1.3 정기결제 프로세스

#### 1.3.1 빌키 발급 단계 (최초 1회)

1. 고객이 카드 정보(카드번호, 유효기간, 생년월일, 비밀번호 앞 2자리) 입력
2. 카드 정보 암호화 후 나이스페이 API(`/v1/subscribe/regist`) 호출
3. 나이스페이가 카드 정보 검증 후 빌키(BID) 발급
4. 발급된 빌키를 사장노트 DB에 저장 (카드정보는 저장하지 않음)

#### 1.3.2 빌키 승인 단계 (정기 결제 시)

1. 정기 결제 일자 도래 시 자동 결제 처리
2. DB에서 고객의 빌키 조회
3. 빌키와 결제 정보를 나이스페이 API(`/v1/subscribe/{bid}/payments`)에 전송
4. 나이스페이가 연결된 카드로 결제 처리
5. 결제 결과 DB에 기록 및 구독 기간 갱신

#### 1.3.3 빌키 삭제 단계 (구독 취소 시)

1. 고객이 구독 취소 요청
2. DB에서 고객의 빌키 조회
3. 나이스페이 API(`/v1/subscribe/{bid}/expire`)를 통해 빌키 삭제
4. 구독 상태 '취소됨'으로 업데이트

### 1.4 정기결제 흐름

**최초 구독 시작:**

```
카드 정보 → 빌키 발급 → 첫 결제 → 구독 정보 저장
```

**정기 결제:**

```
결제일 확인 → 빌키로 결제 요청 → 결제 처리 → 구독 기간 갱신
```

**구독 취소:**

```
취소 요청 → 빌키 삭제 또는 갱신 중단 → 구독 상태 업데이트
```

## 2. 구현 방법

### 2.1 데이터베이스 구조

```sql
-- 구독 플랜 테이블
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  interval TEXT NOT NULL, -- 'monthly', 'yearly'
  features JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 사용자 구독 정보 테이블
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  bid TEXT NOT NULL, -- 나이스페이 빌키
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- 결제 내역 테이블
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tid TEXT, -- 나이스페이 거래번호
  order_id TEXT NOT NULL, -- 상점 거래 고유번호
  amount INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'paid', 'failed', 'cancelled'
  payment_method TEXT NOT NULL, -- 'card'
  card_info JSONB, -- 카드 정보 (마스킹된 카드번호, 카드사 등)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### 2.2 API 엔드포인트 구현

#### 2.2.1 카드 등록 및 빌키 발급 API

- 경로: `/api/subscription/register-card`
- 메소드: POST
- 기능: 고객 카드 정보를 받아 나이스페이 API로 빌키 발급
- 보안: AES-128 암호화 사용
- 처리:
  1. 카드 정보 암호화
  2. 나이스페이 빌키 발급 API 호출
  3. 빌키를 DB에 저장

#### 2.2.2 구독 시작 API

- 경로: `/api/subscription/subscribe`
- 메소드: POST
- 기능: 구독 플랜 선택 및 첫 결제 처리
- 처리:
  1. 선택한 플랜 정보 확인
  2. 저장된 빌키로 첫 결제 요청
  3. 결제 성공시 구독 정보 생성

#### 2.2.3 정기 결제 처리 API (서버 스케줄러)

- 경로: `/api/cron/process-subscriptions`
- 메소드: GET (제한된 접근)
- 기능: 자동 정기 결제 처리
- 보안: 외부 스케줄러에서만 접근 가능하도록 API 키 검증
- 처리:
  1. 갱신이 필요한 구독 조회
  2. 각 구독별 결제 처리
  3. 결제 결과에 따른 구독 상태 업데이트

#### 2.2.4 구독 취소 API

- 경로: `/api/subscription/cancel`
- 메소드: POST
- 기능: 구독 취소 처리
- 옵션:
  - 즉시 취소: 빌키 삭제 및 구독 종료
  - 기간 만료 후 취소: 현재 결제 기간 종료 후 갱신 중단

### 2.3 프론트엔드 컴포넌트

#### 2.3.1 구독 플랜 선택 컴포넌트

- 기능: 플랜 비교 및 선택 UI 제공
- 구현: 플랜 정보 표시, 특장점 비교, 현재 구독 상태 표시

#### 2.3.2 카드 등록 컴포넌트

- 기능: 카드 정보 입력 및 검증
- 구현:
  - 카드번호, 유효기간, 생년월일, 비밀번호 입력 필드
  - 입력값 유효성 검증
  - 보안 강화를 위한 클라이언트측 처리

#### 2.3.3 구독 관리 컴포넌트

- 기능: 현재 구독 상태 확인 및 관리
- 구현:
  - 구독 상태 표시
  - 구독 취소 옵션 제공
  - 결제 내역 조회

### 2.4 보안 및 에러 처리

#### 2.4.1 보안 조치

- 카드 정보는 클라이언트-서버 간 전송 시 HTTPS 사용
- 카드 정보는 AES-128/AES-256 암호화 적용
- 나이스페이 API 호출 시 Basic Auth/Bearer Token 인증 사용
- 빌키만 저장하고 실제 카드 정보는 저장하지 않음

#### 2.4.2 에러 처리

- 결제 실패 시 자동 재시도 로직 구현
- 사용자에게 적절한 오류 메시지 제공
- 결제 실패 시 알림 시스템 구축

### 2.5 스케줄러 구현

#### 2.5.1 정기 결제 스케줄러

- Vercel Cron Jobs 또는 외부 서비스(GitHub Actions) 활용
- 매일 자정에 실행되어 결제일 도래한 구독 처리
- 재시도 로직 구현 (결제 실패 시 3일간 매일 재시도)

#### 2.5.2 만료 임박 알림 스케줄러

- 구독 만료 3일 전 사용자에게 알림 발송
- 카드 정보 변경 필요 시 알림

## 3. 구현 일정

### 3.1 1단계: 기반 작업 (1-2주)

- 데이터베이스 스키마 설계 및 구현
- 나이스페이 API 연동 테스트
- 기본 API 엔드포인트 구조 설계

### 3.2 2단계: 코어 기능 구현 (2-3주)

- 빌키 발급 API 구현
- 구독 시작/관리 API 구현
- 정기 결제 처리 로직 구현
- 프론트엔드 컴포넌트 개발

### 3.3 3단계: 테스트 및 보완 (1-2주)

- 결제 프로세스 통합 테스트
- 예외 상황 처리 및 오류 복구 로직 보완
- 보안 검토 및 강화

### 3.4 4단계: 배포 및 모니터링 (1주)

- 스테이징 환경에서 최종 테스트
- 프로덕션 환경 배포
- 모니터링 시스템 구축

## 4. 확장 계획

### 4.1 쿠폰 및 프로모션 시스템

- 첫 결제 할인 쿠폰
- 연간 결제 할인
- 소개 프로그램 할인

### 4.2 결제 수단 다양화

- 카카오페이, 네이버페이 등 간편결제 추가
- 계좌이체 결제 옵션 추가

### 4.3 구독 분석 대시보드

- 구독 전환율 분석
- 이탈률 및 원인 분석
- 수익 예측 및 분석
