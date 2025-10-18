-- 수동수집 결과 저장 테이블 추가
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 수동수집 결과 저장 테이블
CREATE TABLE manual_collection_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_keyword VARCHAR(255) NOT NULL,
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
  -- 문서수 필드 추가
  blog_count INTEGER DEFAULT 0,
  news_count INTEGER DEFAULT 0,
  webkr_count INTEGER DEFAULT 0,
  cafe_count INTEGER DEFAULT 0,
  raw_json TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 수동수집 결과 테이블 인덱스
CREATE INDEX idx_manual_results_seed_keyword ON manual_collection_results(seed_keyword);
CREATE INDEX idx_manual_results_keyword ON manual_collection_results(keyword);
CREATE INDEX idx_manual_results_total_search ON manual_collection_results(total_search DESC);
CREATE INDEX idx_manual_results_created_at ON manual_collection_results(created_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE manual_collection_results ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (실제 운영에서는 인증 기반으로 변경)
CREATE POLICY "Enable all operations for all users" ON manual_collection_results FOR ALL USING (true);
