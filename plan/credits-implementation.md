# 크레딧 시스템 구현 계획

## 1. 데이터베이스 스키마 변경

### 1.1 사용자 테이블 수정 (profiles)

```sql
ALTER TABLE profiles
ADD COLUMN credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_credits_refresh TIMESTAMP WITH TIME ZONE;
```

### 1.2 크레딧 트랜잭션 로그 테이블 생성

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'refresh', 'usage', 'admin_adjustment'
  feature VARCHAR(50), -- 'ai_copy', 'blog' 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

## 2. PostgreSQL 함수 및 트리거 구현

### 2.1 일일 크레딧 갱신 함수

```sql
CREATE OR REPLACE FUNCTION refresh_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 구독 레벨에 따라 크레딧 할당
  IF NEW.subscription_tier = 'pro' THEN
    NEW.credits := 60;
  ELSE
    NEW.credits := 20;
  END IF;

  -- 트랜잭션 로그 기록
  INSERT INTO credit_transactions (
    user_id, amount, balance_after, type
  ) VALUES (
    NEW.id, NEW.credits, NEW.credits, 'refresh'
  );

  NEW.last_credits_refresh := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 매일 자정 트리거 함수

```sql
CREATE OR REPLACE FUNCTION process_daily_refresh()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET remaining_place_changes = CASE
                              WHEN subscription_tier = 'pro' THEN 3
                              ELSE 3
                            END,
      credits = CASE
                  WHEN subscription_tier = 'pro' THEN 60
                  ELSE 20
                END,
      last_credits_refresh = NOW();

  -- 크레딧 리프레시 트랜잭션 로그 생성
  INSERT INTO credit_transactions (
    user_id, amount, balance_after, type
  )
  SELECT
    id,
    CASE WHEN subscription_tier = 'pro' THEN 60 ELSE 20 END,
    CASE WHEN subscription_tier = 'pro' THEN 60 ELSE 20 END,
    'refresh'
  FROM profiles;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 크레딧 차감 함수

```sql
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id UUID,
  p_feature VARCHAR,
  p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 현재 크레딧 조회
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id;

  -- 크레딧이 충분한지 확인
  IF v_current_credits < p_amount THEN
    RETURN FALSE;
  END IF;

  -- 크레딧 차감
  v_new_balance := v_current_credits - p_amount;

  UPDATE profiles
  SET credits = v_new_balance
  WHERE id = p_user_id;

  -- 트랜잭션 로그 생성
  INSERT INTO credit_transactions (
    user_id, amount, balance_after, type, feature
  ) VALUES (
    p_user_id, -p_amount, v_new_balance, 'usage', p_feature
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## 3. API 라우트 구현

### 3.1 크레딧 차감을 위한 서버 엔드포인트

```typescript
// src/app/api/credits/deduct/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // 세션 확인하여 사용자 인증
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다' }, { status: 401 });
  }

  const body = await req.json();
  const { feature, amount = 1 } = body;

  // 기능과 금액 유효성 검증
  if (!feature || !['ai_copy', 'blog'].includes(feature)) {
    return NextResponse.json({ error: '유효하지 않은 기능입니다' }, { status: 400 });
  }

  // 적절한 크레딧 차감량 계산 (블로그는 2크레딧)
  const creditsToDeduct = feature === 'blog' ? 2 : 1;

  // 차감 함수 호출
  const { data, error } = await supabase.rpc('deduct_user_credits', {
    p_user_id: session.user.id,
    p_feature: feature,
    p_amount: creditsToDeduct,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data === false) {
    return NextResponse.json({ error: '크레딧이 부족합니다' }, { status: 403 });
  }

  // 업데이트된 크레딧 정보 반환
  const { data: userData } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', session.user.id)
    .single();

  return NextResponse.json({
    success: true,
    remaining_credits: userData?.credits || 0,
  });
}
```

### 3.2 자정 리프레시를 위한 Cron Job 설정

```typescript
// src/app/api/cron/daily-refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 이 엔드포인트는 자정에 cron job에 의해 트리거되어야 함
export async function POST(req: NextRequest) {
  // 요청이 인증된 cron 서비스에서 온 것인지 확인
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다' }, { status: 401 });
  }

  // 관리자 권한을 위한 서비스 역할 클라이언트 사용
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc('process_daily_refresh');

  if (error) {
    console.error('일일 리프레시 오류:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '일일 리프레시가 성공적으로 처리되었습니다',
  });
}
```

## 4. 클라이언트 측 구현

### 4.1 AuthContext 업데이트

```typescript
// src/context/AuthContext.tsx
// 사용자 상태에 크레딧 추가
type User = {
  // 기존 속성들
  credits: number;
  last_credits_refresh: string;
};

// 프로필 가져오기 함수에 크레딧 정보 포함하도록 업데이트
const fetchProfile = async () => {
  // 기존 코드
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (profile) {
    setProfile({
      ...profile,
      credits: profile.credits || 0,
      last_credits_refresh: profile.last_credits_refresh,
    });
  }
};
```

### 4.2 크레딧 차감 Hook

```typescript
// src/hooks/useCredits.ts
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type FeatureType = 'ai_copy' | 'blog';

export function useCredits() {
  const { profile, setProfile } = useAuth();
  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deductCredits = async (feature: FeatureType) => {
    setIsDeducting(true);
    setError(null);

    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '크레딧 차감에 실패했습니다');
      }

      // 로컬 상태 업데이트
      if (profile) {
        setProfile({
          ...profile,
          credits: data.remaining_credits,
        });
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsDeducting(false);
    }
  };

  return {
    credits: profile?.credits || 0,
    isDeducting,
    error,
    deductCredits,
    hasEnoughCredits: (feature: FeatureType) => {
      const required = feature === 'blog' ? 2 : 1;
      return (profile?.credits || 0) >= required;
    },
  };
}
```

### 4.3 AI 복사본 생성 컴포넌트에서의 구현 예시

```typescript
// AI 복사본 생성 컴포넌트 예시
import { useCredits } from '@/hooks/useCredits';

function AICopyGenerator() {
  const { credits, deductCredits, hasEnoughCredits, error } = useCredits();

  const generateAICopy = async () => {
    // 먼저 크레딧 확인
    if (!hasEnoughCredits('ai_copy')) {
      alert('AI 복사본을 생성하려면 최소 1개의 크레딧이 필요합니다');
      return;
    }

    try {
      // 생성 프로세스 시작
      // ...처리 로직...

      // 생성이 완료되고 표시할 준비가 되었을 때
      const success = await deductCredits('ai_copy');

      if (success) {
        // 생성된 콘텐츠 표시
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <p>사용 가능한 크레딧: {credits}</p>
      {error && <p className="text-red-500">{error}</p>}
      <button onClick={generateAICopy}>AI 복사본 생성 (1 크레딧)</button>
    </div>
  );
}
```

## 5. 마이그레이션 전략

1. 새 테이블 생성 및 사용자 테이블 변경을 트랜잭션 내에서 수행
2. 구독 등급에 따라 초기 크레딧 값 설정
3. 저장 프로시저 및 트리거 생성
4. 수동으로 일일 리프레시 함수를 호출하여 테스트
5. API 라우트 및 클라이언트 훅 구현
6. 첫 번째 자정 리프레시를 주의 깊게 모니터링하며 배포

## 6. 추가 고려사항

1. 크레딧 소진 시 사용자에게 알림을 표시하는 UI 컴포넌트
2. 관리자 페이지에서 크레딧을 수동으로 조정할 수 있는 기능
3. 사용자 대시보드에 크레딧 사용 내역 및 리프레시 예정 시간 표시
4. 구독 업그레이드 안내 배너 (크레딧이 부족할 때)
