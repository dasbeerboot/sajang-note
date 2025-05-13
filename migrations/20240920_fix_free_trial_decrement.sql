-- 마이그레이션: 무료 체험 차감 함수 보완
-- 작성일: 2024-09-20

-- 기존 함수는 subscription_tier만 확인하고 있어 
-- tier가 'pro'이지만 status가 'canceled'이고 만료된 경우에도 무제한 생성을 허용하는 문제가 있음
CREATE OR REPLACE FUNCTION public.decrement_free_trial_count(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_remaining INTEGER;
  v_is_active_subscription BOOLEAN;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- 현재 프로필 정보 가져오기
  SELECT 
    subscription_tier, 
    subscription_status, 
    subscription_end_date, 
    free_trial_copy_remaining 
  INTO v_profile
  FROM public.profiles
  WHERE id = user_id;
  
  -- 유효한 구독 상태 확인
  -- 구독 상태가 active이거나, canceled이지만 아직 만료되지 않은 경우만 유효
  v_is_active_subscription := 
    (v_profile.subscription_tier != 'free' AND v_profile.subscription_status = 'active') OR
    (v_profile.subscription_tier != 'free' AND v_profile.subscription_status = 'canceled' 
      AND v_profile.subscription_end_date IS NOT NULL 
      AND v_profile.subscription_end_date > v_now);
  
  -- 유효한 유료 구독자는 무제한
  IF v_is_active_subscription THEN
    RETURN jsonb_build_object(
      'canGenerate', true,
      'is_paid', true
    );
  END IF;
  
  -- 무료 체험 횟수 확인
  IF v_profile.free_trial_copy_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'canGenerate', false,
      'message', '무료 체험 횟수를 모두 사용했습니다. 구독하신 후 이용하실 수 있습니다.'
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

-- 사용자 프로필 업데이트 (테스트 계정의 subscription_tier를 free로 변경)
UPDATE public.profiles
SET subscription_tier = 'free'
WHERE id = 'fb739369-a2d3-4d62-aa83-1c33a717ff19'
  AND subscription_status = 'none';

-- 변경 내용 확인 로그
DO $$
BEGIN
  RAISE NOTICE 'decrement_free_trial_count 함수가 업데이트되었습니다. 이제 구독 상태와 만료일을 함께 확인합니다.';
END;
$$; 