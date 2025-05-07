-- 인증 코드 테이블 생성
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 인증 코드 조회를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- profiles 테이블에 phone_verified와 user_status 필드 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'pending' NOT NULL;

-- 휴대폰 인증 완료 시 사용자 상태 업데이트 트리거
CREATE OR REPLACE FUNCTION update_user_status_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_verified = TRUE AND OLD.phone_verified = FALSE THEN
    NEW.user_status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS update_user_status_on_phone_verification ON profiles;

-- 트리거 생성
CREATE TRIGGER update_user_status_on_phone_verification
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.phone_verified <> OLD.phone_verified)
EXECUTE FUNCTION update_user_status_on_verification();

-- 휴대폰 인증 상태 확인 함수
CREATE OR REPLACE FUNCTION is_phone_verified(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_verified BOOLEAN;
BEGIN
  SELECT phone_verified INTO is_verified FROM profiles WHERE id = user_uuid;
  RETURN COALESCE(is_verified, FALSE);
END;
$$ LANGUAGE plpgsql; 