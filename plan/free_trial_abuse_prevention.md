# 무료 체험 남용 방지 시스템 (Free Trial Abuse Prevention)

## 배경 및 목적

사장노트는 신규 사용자에게 구독 전 서비스 체험을 위해 AI 카피 무료 생성 기회(3회)를 제공할 계획입니다. 그러나 사용자가 계정을 삭제하고 재가입하는 방식으로 무한정 무료 서비스를 이용하는 어뷰징 위험이 있습니다. 이런 행위를 방지하기 위해 전화번호 기반의 사용자 식별 및 무료 체험 관리 시스템을 구축합니다.

## 핵심 설계 원칙

1. **전화번호 기반 식별**: 이미 사용 중인 전화번호 인증 시스템을 활용하여 중복 가입 사용자 식별
2. **개인정보 보호**: 전화번호는 해시 처리하여 데이터베이스에 저장
3. **사용자 경험**: 신규 사용자에게는 명확한 무료 체험 기회 안내, 재가입 사용자에게는 적절한 메시지 제공
4. **트래킹 및 모니터링**: 체험 사용 통계 및 어뷰징 시도 모니터링

## 데이터베이스 스키마 변경

### 1. 전화번호 해시 저장 테이블 생성

```sql
CREATE TABLE public.phone_trial_records (
  phone_hash TEXT PRIMARY KEY,
  free_trial_used BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1,
  original_user_id UUID
);
```

### 2. profiles 테이블에 무료 체험 관련 필드 추가

```sql
ALTER TABLE public.profiles
ADD COLUMN free_trial_copy_remaining INTEGER DEFAULT 3,
ADD COLUMN is_new_user BOOLEAN DEFAULT TRUE;
```

## 주요 기능 구현

### 1. 사용자 탈퇴 시 전화번호 정보 저장 (트리거)

```sql
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
  v_phone_hash TEXT;
BEGIN
  -- 탈퇴하는 사용자의 전화번호 가져오기
  SELECT phone INTO v_phone FROM public.profiles WHERE id = OLD.id;

  -- 전화번호가 있고 인증된 경우만 처리
  IF v_phone IS NOT NULL THEN
    -- 해시 생성 (실제 구현에서는 더 강력한 해시 함수 사용)
    v_phone_hash := MD5(v_phone);

    -- phone_trial_records 테이블에 저장/업데이트
    INSERT INTO public.phone_trial_records (phone_hash, free_trial_used, last_used_at, original_user_id)
    VALUES (v_phone_hash, TRUE, NOW(), OLD.id)
    ON CONFLICT (phone_hash)
    DO UPDATE SET
      last_used_at = NOW(),
      usage_count = phone_trial_records.usage_count + 1;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
BEFORE DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
```

### 2. 전화번호 인증 완료 시 무료 체험 여부 확인/설정

```sql
CREATE OR REPLACE FUNCTION public.check_phone_trial(user_id UUID, phone_number TEXT)
RETURNS VOID AS $$
DECLARE
  v_phone_hash TEXT;
  v_trial_record RECORD;
BEGIN
  -- 전화번호 해시 생성
  v_phone_hash := MD5(phone_number);

  -- 기존 기록 확인
  SELECT * INTO v_trial_record
  FROM public.phone_trial_records
  WHERE phone_hash = v_phone_hash;

  -- 이미 사용된 전화번호인 경우
  IF v_trial_record.phone_hash IS NOT NULL THEN
    -- 무료 체험 횟수 0으로 설정 및 신규 사용자 아님 표시
    UPDATE public.profiles
    SET free_trial_copy_remaining = 0, is_new_user = FALSE
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 클라이언트 구현

### 1. 전화번호 인증 완료 후 처리 로직

```typescript
// 전화번호 인증 완료 후 호출하는 함수
async function completePhoneVerification(userId: string, phoneNumber: string) {
  try {
    const { error } = await supabase.rpc('check_phone_trial', {
      user_id: userId,
      phone_number: phoneNumber,
    });

    if (error) throw error;

    // 사용자 프로필의 phone_verified 필드 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone_verified: true })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('전화번호 인증 처리 중 오류:', error);
    return { success: false, error };
  }
}
```

### 2. AI 카피 생성 전 체험 횟수 확인 및 차감

```typescript
// AI 카피 생성 전 호출하는 함수
async function checkCanGenerateCopy(userId: string) {
  try {
    // 사용자 구독 정보 및 무료 체험 카운트 확인
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, free_trial_copy_remaining')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // 유료 구독자는 제한 없음
    if (data.subscription_tier !== 'free') {
      return { canGenerate: true };
    }

    // 무료 체험 카운트 확인
    if (data.free_trial_copy_remaining <= 0) {
      return {
        canGenerate: false,
        message: '무료 체험 횟수를 모두 사용했습니다. 구독을 고려해보세요.',
      };
    }

    // 카운트 차감
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        free_trial_copy_remaining: data.free_trial_copy_remaining - 1,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return {
      canGenerate: true,
      remainingCount: data.free_trial_copy_remaining - 1,
    };
  } catch (error) {
    console.error('생성 가능 여부 확인 중 오류:', error);
    return { canGenerate: false, error };
  }
}
```

### 3. 무료 체험 관련 UI/UX

- 남은 무료 체험 횟수 표시
- 무료 체험 소진 시 구독 유도 메시지
- 재가입 사용자에게는 이전 사용 이력 안내

## 보안 고려사항

1. **전화번호 해시 보안**: 단순 MD5 대신 더 안전한 해시 알고리즘 및 솔트(salt) 사용 고려
2. **개인정보 처리**: 전화번호 원본은 필요 이상으로 저장하지 않음
3. **데이터베이스 접근 제한**: phone_trial_records 테이블에 대한 적절한 RLS 정책 설정

## 향후 확장 가능성

1. **추가 식별 방법**: IP 주소, 브라우저 핑거프린팅 등 추가 식별 방법 도입 고려
2. **체험 기간 제한**: 무료 체험을 횟수뿐만 아니라 기간(예: 7일)으로도 제한
3. **체험 조건 변경**: 체험 횟수나 조건을 관리자가 쉽게 변경할 수 있는 관리 시스템

## 구현 로드맵

1. 데이터베이스 스키마 변경
2. 트리거 및 함수 구현
3. 백엔드 API 구현
4. 프론트엔드 UI/UX 구현
5. 테스트 및 모니터링 시스템 구축

## 모니터링 및 평가

- 무료 체험 사용률 및 전환율 추적
- 어뷰징 시도 감지 및 분석
- 사용자 피드백 수집 및 개선점 도출
