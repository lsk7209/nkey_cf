-- 기존 중복 키워드 정리 스크립트
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 중복 키워드 현황 확인
SELECT 
  keyword,
  COUNT(*) as duplicate_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM manual_collection_results
GROUP BY keyword
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, keyword
LIMIT 20;

-- 2. 중복 키워드 정리 (최신 데이터만 유지)
WITH ranked_keywords AS (
  SELECT 
    id,
    keyword,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY keyword ORDER BY created_at DESC) as rn
  FROM manual_collection_results
)
DELETE FROM manual_collection_results 
WHERE id IN (
  SELECT id 
  FROM ranked_keywords 
  WHERE rn > 1  -- 최신 데이터(rn=1) 제외하고 나머지 삭제
);

-- 3. 정리 결과 확인
SELECT 
  '정리 완료' as status,
  COUNT(*) as total_keywords,
  COUNT(DISTINCT keyword) as unique_keywords
FROM manual_collection_results;

-- 4. 중복 키워드가 남아있는지 재확인
SELECT 
  keyword,
  COUNT(*) as count
FROM manual_collection_results
GROUP BY keyword
HAVING COUNT(*) > 1
ORDER BY count DESC;
