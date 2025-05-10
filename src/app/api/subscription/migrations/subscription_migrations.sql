-- 구독 테이블 생성 함수
CREATE OR REPLACE FUNCTION create_subscription_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 구독 플랜 테이블
  CREATE TABLE IF NOT EXISTS subscription_plans (
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
  CREATE TABLE IF NOT EXISTS subscriptions (
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
  CREATE TABLE IF NOT EXISTS payment_history (
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
  
  -- 테이블 RLS 정책 설정
  -- 구독 플랜 테이블 (모든 사용자 읽기 가능, 관리자만 쓰기 가능)
  ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "구독 플랜 읽기 허용"
    ON subscription_plans FOR SELECT
    USING (true);
  
  -- 구독 정보 테이블 (자신의 구독만 읽기 가능)
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "자신의 구독 정보 읽기 허용"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);
  
  -- 결제 내역 테이블 (자신의 결제 내역만 읽기 가능)
  ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "자신의 결제 내역 읽기 허용"
    ON payment_history FOR SELECT
    USING (auth.uid() = user_id);
END;
$$;

-- profiles 테이블 업데이트 함수
CREATE OR REPLACE FUNCTION update_profiles_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- profiles 테이블에 구독 관련 필드 추가
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS billing_id TEXT,
    ADD COLUMN IF NOT EXISTS card_info JSONB;
END;
$$;

-- 구독 시작 함수
CREATE OR REPLACE FUNCTION start_subscription(
  p_user_id UUID,
  p_plan_id UUID,
  p_bid TEXT,
  p_tid TEXT,
  p_order_id TEXT,
  p_amount INTEGER,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE,
  p_card_info JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- 트랜잭션 시작
  BEGIN
    -- 기존 구독이 있는지 확인
    SELECT id INTO v_subscription_id
    FROM subscriptions
    WHERE user_id = p_user_id;
    
    -- 기존 구독이 있으면 업데이트, 없으면 새로 생성
    IF v_subscription_id IS NOT NULL THEN
      UPDATE subscriptions
      SET plan_id = p_plan_id,
          bid = p_bid,
          status = 'active',
          current_period_start = p_period_start,
          current_period_end = p_period_end,
          cancel_at_period_end = false,
          updated_at = now()
      WHERE id = v_subscription_id;
    ELSE
      INSERT INTO subscriptions (
        user_id, plan_id, bid, status, 
        current_period_start, current_period_end
      ) VALUES (
        p_user_id, p_plan_id, p_bid, 'active', 
        p_period_start, p_period_end
      )
      RETURNING id INTO v_subscription_id;
    END IF;
    
    -- 결제 내역 추가
    INSERT INTO payment_history (
      subscription_id, user_id, tid, order_id, 
      amount, status, payment_method, card_info
    ) VALUES (
      v_subscription_id, p_user_id, p_tid, p_order_id, 
      p_amount, 'paid', 'card', p_card_info
    );
    
    -- 프로필 정보 업데이트
    UPDATE profiles
    SET subscription_status = 'active',
        subscription_end_date = p_period_end
    WHERE id = p_user_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '구독 시작 중 오류가 발생했습니다: %', SQLERRM;
  END;
END;
$$; 