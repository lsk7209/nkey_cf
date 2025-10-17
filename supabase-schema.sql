-- Supabase 데이터베이스 스키마
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 키워드 수집 세션 테이블
CREATE TABLE keyword_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  seed_keywords TEXT[] NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'collecting', 'completed', 'failed')),
  total_keywords INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 키워드 데이터 테이블
CREATE TABLE keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES keyword_collections(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  pc_search INTEGER DEFAULT 0,
  mobile_search INTEGER DEFAULT 0,
  total_search INTEGER DEFAULT 0,
  monthly_click_pc DECIMAL(10,2) DEFAULT 0,
  monthly_click_mobile DECIMAL(10,2) DEFAULT 0,
  ctr_pc DECIMAL(5,2) DEFAULT 0,
  ctr_mobile DECIMAL(5,2) DEFAULT 0,
  ad_count INTEGER DEFAULT 0,
  comp_idx VARCHAR(20),
  raw_json TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_keywords_collection_id ON keywords(collection_id);
CREATE INDEX idx_keywords_total_search ON keywords(total_search DESC);
CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_collections_status ON keyword_collections(status);
CREATE INDEX idx_collections_created_at ON keyword_collections(created_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE keyword_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (실제 운영에서는 인증 기반으로 변경)
CREATE POLICY "Enable all operations for all users" ON keyword_collections FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON keywords FOR ALL USING (true);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_keyword_collections_updated_at 
    BEFORE UPDATE ON keyword_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
