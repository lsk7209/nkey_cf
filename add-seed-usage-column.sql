-- manual_collection_results 테이블에 시드활용 컬럼 추가
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 시드활용 컬럼 추가
ALTER TABLE manual_collection_results 
ADD COLUMN IF NOT EXISTS is_used_as_seed BOOLEAN DEFAULT FALSE;

-- 시드활용 인덱스 추가 (자동수집에서 활용되지 않은 키워드 조회용)
CREATE INDEX IF NOT EXISTS idx_manual_results_seed_usage ON manual_collection_results(is_used_as_seed);

-- 시드활용되지 않은 키워드 조회용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_manual_results_unused_seeds ON manual_collection_results(is_used_as_seed, total_search DESC) 
WHERE is_used_as_seed = FALSE;
