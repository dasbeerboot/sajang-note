-- 생성된 카피 저장용 테이블 생성
CREATE TABLE IF NOT EXISTS ai_generated_copies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  copy_type TEXT NOT NULL, -- 'danggn_title', 'danggn_post' 등
  user_prompt TEXT, -- 사용자 입력 프롬프트 저장
  generated_content TEXT NOT NULL, -- 생성된 전체 콘텐츠
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(place_id, copy_type) -- 메뉴 타입별로 하나의 카피만 저장
);

-- 테이블에 RLS 적용
ALTER TABLE ai_generated_copies ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 카피만 조회 가능
CREATE POLICY "사용자는 자신의 카피만 조회 가능" ON ai_generated_copies
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 카피만 생성 가능
CREATE POLICY "사용자는 자신의 카피만 생성 가능" ON ai_generated_copies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 카피만 업데이트 가능  
CREATE POLICY "사용자는 자신의 카피만 업데이트 가능" ON ai_generated_copies
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 카피만 삭제 가능
CREATE POLICY "사용자는 자신의 카피만 삭제 가능" ON ai_generated_copies
  FOR DELETE USING (auth.uid() = user_id); 