-- 마이그레이션: 무료 체험 남용 방지 시스템 (Free Trial Abuse Prevention)
-- 작성일: 2024-09-18

-- 전화번호 해시 저장 테이블 생성
CREATE TABLE IF NOT EXISTS public.phone_trial_records (
  phone_hash TEXT PRIMARY KEY,
  free_trial_used BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1,
  original_user_id UUID
);

-- RLS 정책 설정 (관리자만 접근 가능)
ALTER TABLE public.phone_trial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "관리자만 접근 가능 - phone_trial_records" ON public.phone_trial_records
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE is_super_admin = true));

-- profiles 테이블에 무료 체험 관련 필드 추가
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS free_trial_copy_remaining INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS is_new_user BOOLEAN DEFAULT TRUE;

-- 사용자 탈퇴 시 전화번호 정보 저장 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
  v_phone_hash TEXT;
  v_phone_verified BOOLEAN;
BEGIN
  -- 탈퇴하는 사용자의 전화번호와 인증 상태 가져오기
  SELECT phone, phone_verified INTO v_phone, v_phone_verified 
  FROM public.profiles 
  WHERE id = OLD.id;
  
  -- 전화번호가 있고 인증된 경우만 처리
  IF v_phone IS NOT NULL AND v_phone_verified = TRUE THEN
    -- 해시 생성 (보안 강화를 위해 솔트 추가 가능)
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

-- 트리거가 이미 존재하는지 확인하고 없을 경우에만 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_deleted'
  ) THEN
    CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
  END IF;
END
$$;

-- 전화번호 인증 시 무료 체험 확인 함수
CREATE OR REPLACE FUNCTION public.check_phone_trial(user_id UUID, phone_number TEXT)
RETURNS JSONB AS $$
DECLARE
  v_phone_hash TEXT;
  v_trial_record RECORD;
  v_result JSONB;
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
    
    v_result := jsonb_build_object(
      'is_returning_user', true,
      'usage_count', v_trial_record.usage_count,
      'last_used_at', v_trial_record.last_used_at
    );
  ELSE
    v_result := jsonb_build_object(
      'is_returning_user', false
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 무료 체험 카피 생성 카운트 차감 함수
CREATE OR REPLACE FUNCTION public.decrement_free_trial_count(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_remaining INTEGER;
BEGIN
  -- 현재 프로필 정보 가져오기
  SELECT subscription_tier, free_trial_copy_remaining 
  INTO v_profile
  FROM public.profiles
  WHERE id = user_id;
  
  -- 유료 구독자는 무제한
  IF v_profile.subscription_tier != 'free' THEN
    RETURN jsonb_build_object(
      'canGenerate', true,
      'is_paid', true
    );
  END IF;
  
  -- 무료 체험 횟수 확인
  IF v_profile.free_trial_copy_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'canGenerate', false,
      'message', '무료 체험 횟수를 모두 사용했습니다. 구독을 고려해보세요.'
    );
  END IF;
  
  -- 카운트 차감
  UPDATE public.profiles
  SET free_trial_copy_remaining = free_trial_copy_remaining - 1
  WHERE id = user_id
  RETURNING free_trial_copy_remaining INTO v_remaining;
  
  RETURN jsonb_build_object(
    'canGenerate', true,
    'remainingCount', v_remaining
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 