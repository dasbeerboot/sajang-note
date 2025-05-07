# 사장노트 데이터베이스 스키마 설계

## 개요

사장노트는 소상공인을 위한 마케팅 콘텐츠 자동 생성 서비스입니다. 사용자는 자신의 매장(플레이스) 정보를 등록하고, 이를 기반으로 마케팅 콘텐츠를 생성할 수 있습니다. 요금제는 관리 가능한 플레이스 수에 따라 달라집니다.

- 기본 요금제: 월 5,900원 (플레이스 1개)
- 프리미엄 요금제: 월 9,900원 (플레이스 3개)

## 테이블 구조

### 1. profiles 테이블

Supabase Auth를 통해 생성된 사용자 정보를 확장하기 위한 테이블입니다.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  subscription_tier TEXT DEFAULT 'basic' NOT NULL,
  subscription_status TEXT DEFAULT 'active' NOT NULL,
  max_places INTEGER DEFAULT 1 NOT NULL,
  next_place_change_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '14 days')
);
```

### 2. places 테이블

사용자가 관리하는 매장(플레이스) 정보를 저장하는 테이블입니다.

```sql
CREATE TABLE places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  place_id TEXT NOT NULL UNIQUE,
  place_name TEXT NOT NULL,
  place_address TEXT NOT NULL,
  place_phone TEXT,
  place_category TEXT,
  place_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_data_refresh TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### 3. place_data 테이블

플레이스에서 수집된 데이터(리뷰, 이미지 등)를 저장하는 테이블입니다.

```sql
CREATE TABLE place_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  place_id UUID REFERENCES places(id) NOT NULL,
  data_type TEXT NOT NULL, -- 'review', 'image', 'menu', 등
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### 4. subscriptions 테이블

사용자의 구독 정보를 저장하는 테이블입니다.

```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  tier TEXT NOT NULL, -- 'basic', 'premium'
  price NUMERIC NOT NULL,
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### 5. contents 테이블

생성된 마케팅 콘텐츠를 저장하는 테이블입니다.

```sql
CREATE TABLE contents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  place_id UUID REFERENCES places(id) NOT NULL,
  content_type TEXT NOT NULL, -- 'daangn', 'powerlink', 'thread', 등
  content TEXT NOT NULL,
  images TEXT[],
  status TEXT DEFAULT 'draft' NOT NULL, -- 'draft', 'published', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### 6. place_change_logs 테이블

사용자의 플레이스 변경 기록을 저장하는 테이블입니다.

```sql
CREATE TABLE place_change_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  old_place_id UUID REFERENCES places(id),
  new_place_id UUID REFERENCES places(id),
  change_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  reason TEXT
);
```

## 인덱스

```sql
-- 사용자별 플레이스 조회를 위한 인덱스
CREATE INDEX idx_places_user_id ON places(user_id);

-- 플레이스별 데이터 조회를 위한 인덱스
CREATE INDEX idx_place_data_place_id ON place_data(place_id);

-- 사용자별 콘텐츠 조회를 위한 인덱스
CREATE INDEX idx_contents_user_id ON contents(user_id);
CREATE INDEX idx_contents_place_id ON contents(place_id);

-- 구독 관리를 위한 인덱스
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
```

## RLS(Row Level Security) 정책

Supabase에서는 RLS를 통해 데이터 접근 제어를 할 수 있습니다.

```sql
-- profiles 테이블 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "사용자는 자신의 프로필만 볼 수 있음" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "사용자는 자신의 프로필만 수정할 수 있음" ON profiles FOR UPDATE USING (auth.uid() = id);

-- places 테이블 RLS
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "사용자는 자신의 플레이스만 볼 수 있음" ON places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "사용자는 자신의 플레이스만 추가할 수 있음" ON places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "사용자는 자신의 플레이스만 수정할 수 있음" ON places FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "사용자는 자신의 플레이스만 삭제할 수 있음" ON places FOR DELETE USING (auth.uid() = user_id);

-- 나머지 테이블에도 유사한 RLS 정책을 적용
```

## 트리거

```sql
-- 프로필 업데이트 시간 자동 갱신
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 플레이스 업데이트 시간 자동 갱신
CREATE TRIGGER update_places_updated_at
BEFORE UPDATE ON places
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 사용자의 플레이스 수 제한 체크
CREATE FUNCTION check_place_limit() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM places WHERE user_id = NEW.user_id) >= 
     (SELECT max_places FROM profiles WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION '플레이스 최대 개수를 초과했습니다';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_place_limit
BEFORE INSERT ON places
FOR EACH ROW
EXECUTE FUNCTION check_place_limit();
```

## 함수

```sql
-- 업데이트 시간 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 플레이스 변경 가능 여부 체크 함수
CREATE OR REPLACE FUNCTION can_change_place(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  next_change_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT next_place_change_date INTO next_change_date FROM profiles WHERE id = user_uuid;
  RETURN now() >= next_change_date;
END;
$$ LANGUAGE plpgsql;
```

## 고려사항 및 추가 질문

1. 플레이스 데이터는 어떤 방식으로 수집할 예정인가요? (API, 크롤링 등)
2. 결제 시스템은 어떻게 연동할 계획인가요?
3. 플레이스 변경 제한(14일에 한 번)을 어떻게 UI에서 표현할 계획인가요?
4. 사용자가 요금제를 변경하면 플레이스 수 제한은 어떻게 처리할 계획인가요?
5. 콘텐츠 생성 기록과 버전 관리는 어떻게 할 계획인가요? 