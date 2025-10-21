# Supabase → CSV → D1 마이그레이션 가이드

## 1. Supabase에서 데이터 Export

### manual_collection_results 테이블 Export
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  seed_keyword,
  keyword,
  pc_search,
  mobile_search,
  total_search,
  monthly_click_pc,
  monthly_click_mobile,
  ctr_pc,
  ctr_mobile,
  ad_count,
  comp_idx,
  blog_count,
  news_count,
  webkr_count,
  cafe_count,
  is_used_as_seed,
  raw_json,
  fetched_at,
  created_at
FROM manual_collection_results
ORDER BY created_at DESC;
```

### keyword_collections 테이블 Export
```sql
SELECT 
  name,
  description,
  seed_keywords,
  status,
  total_keywords,
  created_at,
  updated_at,
  completed_at
FROM keyword_collections
ORDER BY created_at DESC;
```

### keywords 테이블 Export
```sql
SELECT 
  collection_id,
  keyword,
  pc_search,
  mobile_search,
  total_search,
  monthly_click_pc,
  monthly_click_mobile,
  ctr_pc,
  ctr_mobile,
  ad_count,
  comp_idx,
  raw_json,
  fetched_at,
  created_at
FROM keywords
ORDER BY created_at DESC;
```

## 2. CSV 파일 준비

1. Supabase 대시보드에서 각 테이블을 CSV로 export
2. CSV 파일명: `manual_collection_results.csv`, `keyword_collections.csv`, `keywords.csv`
3. UTF-8 인코딩으로 저장

## 3. D1 데이터베이스에 Import

### Wrangler CLI 사용
```bash
# D1 데이터베이스 생성 (이미 생성되어 있다면 생략)
wrangler d1 create NKEY_DB

# 마이그레이션 실행
wrangler d1 migrations apply NKEY_DB

# CSV 데이터 Import
wrangler d1 execute NKEY_DB --file=manual_collection_results.csv --command="
.mode csv
.import manual_collection_results.csv temp_manual_results
INSERT OR IGNORE INTO manual_collection_results 
(seed_keyword, keyword, pc_search, mobile_search, total_search, 
 monthly_click_pc, monthly_click_mobile, ctr_pc, ctr_mobile, 
 ad_count, comp_idx, blog_count, news_count, webkr_count, cafe_count, 
 is_used_as_seed, raw_json, fetched_at, created_at)
SELECT * FROM temp_manual_results;
DROP TABLE temp_manual_results;
"
```

### 또는 SQL 스크립트로 Import
```sql
-- manual_collection_results Import
.mode csv
.import manual_collection_results.csv temp_manual_results
INSERT OR IGNORE INTO manual_collection_results 
(seed_keyword, keyword, pc_search, mobile_search, total_search, 
 monthly_click_pc, monthly_click_mobile, ctr_pc, ctr_mobile, 
 ad_count, comp_idx, blog_count, news_count, webkr_count, cafe_count, 
 is_used_as_seed, raw_json, fetched_at, created_at)
SELECT * FROM temp_manual_results;
DROP TABLE temp_manual_results;
```

## 4. 데이터 검증

```sql
-- 데이터 개수 확인
SELECT COUNT(*) as total_records FROM manual_collection_results;
SELECT COUNT(*) as total_collections FROM keyword_collections;
SELECT COUNT(*) as total_keywords FROM keywords;

-- 최신 데이터 확인
SELECT * FROM manual_collection_results ORDER BY created_at DESC LIMIT 5;
```

## 5. 주의사항

- CSV 파일의 컬럼 순서가 D1 테이블 스키마와 일치해야 함
- `INSERT OR IGNORE`를 사용하여 중복 데이터 방지
- 대용량 데이터의 경우 배치로 나누어 Import
- Import 후 인덱스 재구성 확인
