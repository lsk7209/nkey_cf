-- 키워드 수집 결과 테이블 (기존 Supabase manual_collection_results와 호환)
CREATE TABLE IF NOT EXISTS manual_collection_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seed_keyword TEXT NOT NULL,
  keyword TEXT NOT NULL,
  pc_search INTEGER DEFAULT 0,
  mobile_search INTEGER DEFAULT 0,
  total_search INTEGER DEFAULT 0,
  monthly_click_pc REAL DEFAULT 0,
  monthly_click_mobile REAL DEFAULT 0,
  ctr_pc REAL DEFAULT 0,
  ctr_mobile REAL DEFAULT 0,
  ad_count INTEGER DEFAULT 0,
  comp_idx TEXT,
  blog_count INTEGER DEFAULT 0,
  news_count INTEGER DEFAULT 0,
  webkr_count INTEGER DEFAULT 0,
  cafe_count INTEGER DEFAULT 0,
  is_used_as_seed BOOLEAN DEFAULT FALSE,
  raw_json TEXT,
  fetched_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 자동수집3 상태 테이블
CREATE TABLE IF NOT EXISTS auto_collect3_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_running BOOLEAN DEFAULT FALSE,
  current_seed TEXT,
  seeds_processed INTEGER DEFAULT 0,
  total_seeds INTEGER DEFAULT 0,
  keywords_collected INTEGER DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  status_message TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 키워드 컬렉션 테이블 (기존 Supabase keyword_collections와 호환)
CREATE TABLE IF NOT EXISTS keyword_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  seed_keywords TEXT, -- JSON string
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collecting', 'completed', 'failed')),
  total_keywords INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- 키워드 데이터 테이블 (기존 Supabase keywords와 호환)
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  pc_search INTEGER DEFAULT 0,
  mobile_search INTEGER DEFAULT 0,
  total_search INTEGER DEFAULT 0,
  monthly_click_pc REAL DEFAULT 0,
  monthly_click_mobile REAL DEFAULT 0,
  ctr_pc REAL DEFAULT 0,
  ctr_mobile REAL DEFAULT 0,
  ad_count INTEGER DEFAULT 0,
  comp_idx TEXT,
  raw_json TEXT,
  fetched_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES keyword_collections(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_manual_results_seed_keyword ON manual_collection_results(seed_keyword);
CREATE INDEX IF NOT EXISTS idx_manual_results_keyword ON manual_collection_results(keyword);
CREATE INDEX IF NOT EXISTS idx_manual_results_total_search ON manual_collection_results(total_search DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_created_at ON manual_collection_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_blog_count ON manual_collection_results(blog_count DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_news_count ON manual_collection_results(news_count DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_webkr_count ON manual_collection_results(webkr_count DESC);
CREATE INDEX IF NOT EXISTS idx_manual_results_cafe_count ON manual_collection_results(cafe_count DESC);

CREATE INDEX IF NOT EXISTS idx_keywords_collection_id ON keywords(collection_id);
CREATE INDEX IF NOT EXISTS idx_keywords_total_search ON keywords(total_search DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_collections_status ON keyword_collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON keyword_collections(created_at DESC);

-- 초기 상태 레코드 삽입
INSERT OR IGNORE INTO auto_collect3_status (id, is_running, total_seeds, seeds_processed, keywords_collected, status_message)
VALUES (1, FALSE, 0, 0, 0, '대기 중');
