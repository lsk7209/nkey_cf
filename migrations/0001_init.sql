-- 황금키워드 탐색기 데이터베이스 스키마
-- Cloudflare D1용 SQL 스키마

CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_bucket TEXT NOT NULL,
  keyword TEXT NOT NULL,
  rel_keyword TEXT NOT NULL,
  pc_search INTEGER DEFAULT 0,
  mobile_search INTEGER DEFAULT 0,
  click_pc REAL DEFAULT 0,
  click_mo REAL DEFAULT 0,
  ctr_pc REAL DEFAULT 0,
  ctr_mo REAL DEFAULT 0,
  ad_count INTEGER DEFAULT 0,
  comp_idx TEXT,
  blog_count INTEGER DEFAULT 0,
  cafe_count INTEGER DEFAULT 0,
  news_count INTEGER DEFAULT 0,
  web_count INTEGER DEFAULT 0,
  total_docs INTEGER DEFAULT 0,
  potential_score REAL DEFAULT 0,
  raw_json TEXT,
  fetched_at TEXT NOT NULL
);

-- 중복 방지를 위한 유니크 인덱스
CREATE UNIQUE INDEX ux_kw ON keywords(date_bucket, keyword, rel_keyword);

-- 시간순 정렬을 위한 인덱스
CREATE INDEX ix_time ON keywords(fetched_at DESC);

-- 키워드 검색을 위한 인덱스
CREATE INDEX ix_keyword ON keywords(keyword);

-- 경쟁도 필터링을 위한 인덱스
CREATE INDEX ix_comp ON keywords(comp_idx);

-- 잠재지수 정렬을 위한 인덱스
CREATE INDEX ix_potential ON keywords(potential_score DESC);
