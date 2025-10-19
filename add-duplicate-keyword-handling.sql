-- 중복 키워드 처리 로직을 위한 인덱스 및 함수 추가
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 키워드 중복 체크를 위한 복합 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_manual_results_keyword_created 
ON manual_collection_results(keyword, created_at DESC);

-- 중복 키워드 처리 함수 생성
CREATE OR REPLACE FUNCTION handle_duplicate_keywords()
RETURNS TRIGGER AS $$
BEGIN
  -- 같은 키워드가 이미 존재하는지 확인 (30일 이내)
  IF EXISTS (
    SELECT 1 FROM manual_collection_results 
    WHERE keyword = NEW.keyword 
    AND created_at > NOW() - INTERVAL '30 days'
  ) THEN
    -- 30일 이내에 같은 키워드가 있으면 삽입하지 않음 (패스)
    RETURN NULL;
  ELSE
    -- 30일 이전이거나 없으면 삽입
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 중복 키워드 처리 트리거 생성
DROP TRIGGER IF EXISTS trigger_handle_duplicate_keywords ON manual_collection_results;
CREATE TRIGGER trigger_handle_duplicate_keywords
  BEFORE INSERT ON manual_collection_results
  FOR EACH ROW
  EXECUTE FUNCTION handle_duplicate_keywords();

-- 기존 중복 키워드 정리 (30일 이내 중복 제거)
WITH duplicates AS (
  SELECT 
    keyword,
    MIN(created_at) as keep_date,
    array_agg(id ORDER BY created_at DESC) as ids
  FROM manual_collection_results
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY keyword
  HAVING COUNT(*) > 1
)
DELETE FROM manual_collection_results 
WHERE id IN (
  SELECT unnest(ids[2:]) -- 첫 번째(최신) 제외하고 나머지 삭제
  FROM duplicates
);
