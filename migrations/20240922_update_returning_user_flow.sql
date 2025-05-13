-- 마이그레이션: 재가입 사용자의 무료 체험 횟수 설정 변경
-- 작성일: 2024-09-22

-- 재가입 사용자의 무료 체험 횟수 설정 로직 수정
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
  v_phone_verified BOOLEAN;
  v_is_returning_user BOOLEAN;
  v_full_name TEXT;
  v_free_trial_count INTEGER;
BEGIN
  -- 새 사용자의 메타데이터에서 필요한 정보 추출
  v_phone := (NEW.raw_user_meta_data->>'phone')::TEXT;
  v_phone_verified := (NEW.raw_user_meta_data->>'phone_verified')::BOOLEAN;
  v_is_returning_user := (NEW.raw_user_meta_data->>'is_returning_user')::BOOLEAN;
  v_full_name := (NEW.raw_user_meta_data->>'full_name')::TEXT;
  
  -- 재가입 사용자의 경우 무료 체험 횟수 0으로 설정
  IF v_is_returning_user = TRUE THEN
    v_free_trial_count := 0;
  ELSE
    v_free_trial_count := 3; -- 신규 사용자 기본값
  END IF;
  
  -- 프로필 정보 삽입
  INSERT INTO public.profiles (
    id, 
    email,
    full_name,
    phone,
    phone_verified,
    user_status,
    subscription_tier,
    subscription_status,
    max_places,
    remaining_place_changes,
    free_trial_copy_remaining,
    is_new_user
  ) VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_phone,
    v_phone_verified,
    'pending',
    'free',
    'none',
    1,      -- 기본 1개 매장
    1,      -- 기본 1회 변경 가능
    v_free_trial_count, -- 재가입 여부에 따라 달라짐
    NOT v_is_returning_user  -- 재가입 사용자는 신규 사용자가 아님
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 이미 존재하는지 확인하고 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- 로그 남기기
DO $$
BEGIN
  RAISE NOTICE '재가입 사용자의 무료 체험 횟수 설정 로직이 업데이트되었습니다.';
END
$$; 