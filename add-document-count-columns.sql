-- 기존 manual_collection_results 테이블에 문서수 컬럼 추가
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 문서수 필드 추가
ALTER TABLE manual_collection_results 
ADD COLUMN IF NOT EXISTS blog_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS news_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS webkr_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cafe_count INTEGER DEFAULT 0;

-- 문서수 관련 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_manual_results_blog_count ON manual_collection_results(blog_count DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_news_count ON manual_collection_results(news_count DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_webkr_count ON manual_collection_results(webkr_count DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_cafe_count ON manual_collection_results(cafe_count DESC);
