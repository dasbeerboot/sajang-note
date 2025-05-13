-- 마이그레이션: 사용자 삭제 시 관련 데이터 처리 개선
-- 작성일: 2024-09-21

-- 먼저 외래 키 제약 조건을 확인
DO $$
BEGIN
  RAISE NOTICE '외래 키 제약 조건 수정 시작...';
END;
$$;

-- place_change_logs 테이블이 존재하는지 확인하고 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'place_change_logs'
  ) THEN
    CREATE TABLE public.place_change_logs (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      old_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
      new_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
      change_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      reason TEXT
    );
    
    RAISE NOTICE '테이블 place_change_logs가 생성되었습니다.';
  ELSE
    RAISE NOTICE '테이블 place_change_logs가 이미 존재합니다.';
  END IF;
END;
$$;

-- 기존 제약 조건 삭제 및 CASCADE 옵션 적용
-- 1. ai_generated_copies 테이블
ALTER TABLE public.ai_generated_copies
DROP CONSTRAINT IF EXISTS ai_generated_copies_user_id_fkey,
ADD CONSTRAINT ai_generated_copies_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. places 테이블
ALTER TABLE public.places
DROP CONSTRAINT IF EXISTS places_user_id_fkey,
ADD CONSTRAINT places_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. subscriptions 테이블
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey,
ADD CONSTRAINT subscriptions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. payment_history 테이블
ALTER TABLE public.payment_history
DROP CONSTRAINT IF EXISTS payment_history_user_id_fkey,
ADD CONSTRAINT payment_history_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. place_crawl_logs 테이블
ALTER TABLE public.place_crawl_logs
DROP CONSTRAINT IF EXISTS place_crawl_logs_user_id_fkey,
ADD CONSTRAINT place_crawl_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. place_change_logs 테이블 - 테이블 존재 확인 후 제약 조건 변경
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'place_change_logs'
  ) THEN
    ALTER TABLE public.place_change_logs
    DROP CONSTRAINT IF EXISTS place_change_logs_user_id_fkey,
    ADD CONSTRAINT place_change_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'place_change_logs 테이블의 외래 키 제약 조건이 수정되었습니다.';
  END IF;
END;
$$;

-- 기존 트리거 함수는 유지 (전화번호 해시 저장용)
-- 다만 오류 처리를 개선하여 삭제가 항상 진행되도록 수정
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
  v_phone_hash TEXT;
  v_phone_verified BOOLEAN;
BEGIN
  -- 삭제되는 사용자의 전화번호 정보 추출
  BEGIN
    SELECT phone, phone_verified INTO v_phone, v_phone_verified 
    FROM public.profiles 
    WHERE id = OLD.id;
    
    -- 인증된 전화번호만 해시로 저장
    IF v_phone IS NOT NULL AND v_phone_verified = TRUE THEN
      v_phone_hash = md5(v_phone);
      
      -- 전화번호 해시 저장 (재가입 사용자 판별용)
      INSERT INTO public.phone_trial_records (phone_hash, usage_count)
      VALUES (v_phone_hash, 1)
      ON CONFLICT (phone_hash)
      DO UPDATE SET 
        usage_count = phone_trial_records.usage_count + 1;
        
      RAISE NOTICE '사용자 삭제: 전화번호 해시가 저장되었습니다. 사용자 ID: %', OLD.id;
    ELSE
      RAISE NOTICE '사용자 삭제: 전화번호가 없거나 인증되지 않았습니다. 사용자 ID: %', OLD.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- 오류가 발생해도 사용자 삭제 과정은 계속 진행
    RAISE NOTICE '전화번호 처리 중 오류 발생: %. 사용자 ID: %', SQLERRM, OLD.id;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 이미 존재하는지 확인하고 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_deleted'
  ) THEN
    CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_deleted();
    
    RAISE NOTICE '사용자 삭제 트리거가 생성되었습니다.';
  ELSE
    RAISE NOTICE '사용자 삭제 트리거가 이미 존재합니다.';
  END IF;
END
$$;

-- 로그 남기기
DO $$
BEGIN
  RAISE NOTICE '외래 키 제약 조건에 ON DELETE CASCADE 옵션이 추가되었습니다.';
  RAISE NOTICE 'handle_user_deleted 트리거 함수가 업데이트되었습니다.';
END;
$$; 