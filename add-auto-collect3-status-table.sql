-- 자동수집3 상태 관리 테이블 생성
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 자동수집3 상태 테이블 생성
CREATE TABLE IF NOT EXISTS auto_collect3_status (
  id SERIAL PRIMARY KEY,
  is_running BOOLEAN DEFAULT FALSE,
  current_seed TEXT,
  seeds_processed INTEGER DEFAULT 0,
  total_seeds INTEGER DEFAULT 0,
  keywords_collected INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status_message TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 자동수집3 상태 인덱스
CREATE INDEX IF NOT EXISTS idx_auto_collect3_status_running ON auto_collect3_status(is_running);

-- 자동수집3 상태 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_auto_collect3_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 자동수집3 상태 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_auto_collect3_status_updated_at ON auto_collect3_status;
CREATE TRIGGER trigger_auto_collect3_status_updated_at
  BEFORE UPDATE ON auto_collect3_status
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_collect3_status_updated_at();

-- 초기 상태 레코드 삽입 (항상 하나의 레코드만 유지)
INSERT INTO auto_collect3_status (id, is_running, total_seeds, seeds_processed, keywords_collected, status_message)
VALUES (1, FALSE, 0, 0, 0, '대기 중')
ON CONFLICT (id) DO NOTHING;
