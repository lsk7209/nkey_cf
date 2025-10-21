# 🚀 Cloudflare 설정 가이드

## 1. Cloudflare 계정 및 API 토큰 설정

### 1.1 Cloudflare 계정 생성
1. [Cloudflare 대시보드](https://dash.cloudflare.com) 접속
2. 계정 생성 또는 로그인
3. 무료 플랜으로 시작 (Workers, Pages, D1, R2, KV 모두 무료 제공)

### 1.2 최신 대시보드 네비게이션 (2025년 업데이트)
**중요**: 최신 Cloudflare 대시보드에서는 메뉴 구조가 변경되었습니다!

#### 새로운 메뉴 구조:
- **"Workers"** → **"Workers & Pages"**로 통합
- **"Create a Worker"** → **"Create a Service"**로 변경
- 좌측 메뉴에서 **"Workers & Pages"** 찾기
- 없으면 **"Workers"** 메뉴 직접 클릭

### 1.3 API 토큰 생성 (2025년 업데이트)
1. **My Profile** → **API Tokens** 이동
2. **Create Token** 클릭
3. **Custom token** 선택
4. 다음 권한 설정 (최신 권한 구조):
   ```
   Account: Cloudflare Pages:Edit
   Account: Cloudflare Workers:Edit
   Account: Account Settings:Read
   Zone: Zone:Read
   ```
5. **Continue to summary** → **Create Token**
6. 토큰 복사하여 안전한 곳에 저장

### 1.4 대시보드 접근 방법 (문제 해결)
**Workers 메뉴가 보이지 않는 경우:**

#### 방법 1: 직접 URL 접근
```
https://dash.cloudflare.com/workers
또는
https://dash.cloudflare.com/workers/overview
```

#### 방법 2: Wrangler CLI 사용 (가장 확실한 방법)
```bash
# Wrangler 설치
npm install -g wrangler

# Cloudflare 로그인
wrangler login

# 계정 정보 확인
wrangler whoami
```

### 1.5 Account ID 확인
1. 대시보드 우측 사이드바에서 **Account ID** 복사

## 2. D1 데이터베이스 설정

### 2.1 D1 데이터베이스 생성
```bash
# Wrangler CLI 설치 (이미 설치되어 있다면 생략)
npm install -g wrangler

# Cloudflare 로그인
wrangler login

# D1 데이터베이스 생성
wrangler d1 create NKEY_DB
```

### 2.2 생성된 데이터베이스 ID 확인
```bash
# D1 데이터베이스 목록 확인
wrangler d1 list
```

### 2.3 마이그레이션 실행
```bash
# 마이그레이션 실행
wrangler d1 migrations apply NKEY_DB
```

### 2.4 데이터 검증
```bash
# 테이블 확인
wrangler d1 execute NKEY_DB --command "SELECT name FROM sqlite_master WHERE type='table';"

# 레코드 수 확인
wrangler d1 execute NKEY_DB --command "SELECT COUNT(*) FROM manual_collection_results;"
```

## 3. R2 버킷 설정

### 3.1 R2 버킷 생성
1. Cloudflare 대시보드 → **R2 Object Storage**
2. **Create bucket** 클릭
3. 버킷 이름: `nkey-r2`
4. **Create bucket** 클릭

### 3.2 R2 권한 설정
1. 버킷 설정 → **Permissions**
2. **Public access** 활성화 (필요시)
3. **CORS** 설정 (필요시)

## 4. KV 네임스페이스 설정

### 4.1 KV 네임스페이스 생성
```bash
# 캐시용 KV
wrangler kv:namespace create "KV_CACHE"

# 레이트리밋용 KV
wrangler kv:namespace create "KV_RL"

# 작업 로그용 KV
wrangler kv:namespace create "KV_JOBS"
```

### 4.2 생성된 네임스페이스 ID 확인
```bash
# KV 네임스페이스 목록 확인
wrangler kv:namespace list
```

## 5. Pages 프로젝트 설정

### 5.1 Pages 프로젝트 생성 (2025년 업데이트)
1. Cloudflare 대시보드 → **Workers & Pages** (또는 **Pages**)
2. **Create a project** 클릭
3. **Connect to Git** 선택
4. GitHub 저장소 연결: `lsk7209/nkey_cf`
5. 프로젝트 이름: `nkey-cf`
6. **Save and Deploy** 클릭

### 5.2 최신 Pages 인터페이스 변경사항
- **"Pages"** 메뉴가 **"Workers & Pages"**로 통합
- **"Create a project"** → **"Create a project"** (변경 없음)
- **"Connect to Git"** → **"Connect to Git"** (변경 없음)

### 5.3 빌드 설정
- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.vercel/output/static`
- **Root directory**: `/` (기본값)

## 6. Workers 설정

### 6.1 Workers 배포 (2025년 업데이트)
```bash
# Workers 배포
wrangler deploy
```

### 6.2 최신 Workers 인터페이스 변경사항
- **"Create a Worker"** → **"Create a Service"**로 변경
- **"Workers"** → **"Workers & Pages"**로 통합
- **"Triggers"** → **"Triggers"** (변경 없음)

### 6.3 Cron 트리거 설정
1. Cloudflare 대시보드 → **Workers & Pages**
2. 생성된 Worker 선택
3. **Triggers** 탭 → **Cron Triggers**
4. **Add Cron Trigger** 클릭
5. **Cron expression**: `0 * * * *` (매 정시)
6. **Add** 클릭

## 7. 환경변수 설정

### 7.1 wrangler.toml 업데이트
생성된 ID들을 `wrangler.toml`에 업데이트:

```toml
[[d1_databases]]
binding = "DB"
database_name = "NKEY_DB"
database_id = "YOUR_D1_DB_ID_HERE"  # 실제 ID로 교체

[[kv_namespaces]]
binding = "KV_CACHE"
id = "YOUR_KV_CACHE_ID_HERE"  # 실제 ID로 교체

[[kv_namespaces]]
binding = "KV_RL"
id = "YOUR_KV_RL_ID_HERE"  # 실제 ID로 교체

[[kv_namespaces]]
binding = "KV_JOBS"
id = "YOUR_KV_JOBS_ID_HERE"  # 실제 ID로 교체
```

### 7.2 GitHub Secrets 설정
GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**:

```
CF_API_TOKEN=your_api_token_here
CF_ACCOUNT_ID=your_account_id_here
PAGES_PROJECT_NAME=nkey-cf
D1_DB=NKEY_DB
```

### 7.3 Cloudflare Secrets 설정
```bash
# Pages에서 사용할 Secrets 설정
wrangler secret put POSTS_API_KEY
wrangler secret put REVALIDATE_SECRET
wrangler secret put SLACK_WEBHOOK_URL
wrangler secret put MAKE_WEBHOOK_URL
```

## 8. 데이터 마이그레이션

### 8.1 Supabase에서 데이터 Export
1. Supabase 대시보드 → **Table Editor**
2. 각 테이블을 CSV로 Export:
   - `manual_collection_results`
   - `keyword_collections`
   - `keywords`

### 8.2 D1으로 데이터 Import
```bash
# CSV 파일을 D1으로 Import
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

## 9. 배포 및 테스트

### 9.1 자동 배포 확인
1. GitHub에 코드 Push
2. GitHub Actions 실행 확인
3. Cloudflare Pages 배포 확인
4. Workers 배포 확인

### 9.2 기능 테스트
```bash
# 로컬 테스트
npm run cf:dev

# D1 연결 테스트
wrangler d1 execute NKEY_DB --command "SELECT COUNT(*) FROM manual_collection_results;"

# Workers 로그 확인
wrangler tail
```

## 10. 모니터링 설정

### 10.1 Cloudflare Analytics
1. **Analytics & Logs** → **Web Analytics**
2. **Real User Monitoring** 활성화

### 10.2 알림 설정
1. **Notifications** → **Add notification**
2. **Workers** → **Error rate** 설정
3. **Pages** → **Build failures** 설정

## 11. 비용 최적화

### 11.1 무료 플랜 한도
- **Workers**: 100,000 requests/day
- **Pages**: 500 builds/month
- **D1**: 5GB storage, 5M reads/day
- **R2**: 10GB storage, 1M requests/month
- **KV**: 100,000 reads/day

### 11.2 사용량 모니터링
1. **Billing** → **Usage** 확인
2. 한도 초과 시 알림 설정
3. 필요시 유료 플랜 업그레이드

## 12. 문제 해결

### 12.1 일반적인 문제
```bash
# 권한 오류
wrangler login

# 배포 실패
wrangler deploy --compatibility-date=2025-01-21

# D1 연결 오류
wrangler d1 execute NKEY_DB --command "SELECT 1;"
```

### 12.2 로그 확인
```bash
# Workers 로그
wrangler tail

# Pages 로그
wrangler pages deployment tail

# D1 쿼리 로그
wrangler d1 execute NKEY_DB --command "EXPLAIN QUERY PLAN SELECT * FROM manual_collection_results LIMIT 1;"
```

## 13. 보안 설정

### 13.1 CORS 설정
```bash
# R2 CORS 설정
wrangler r2 bucket cors set nkey-r2 --file=cors.json
```

### 13.2 접근 제어
1. **Access** → **Application Launcher**
2. **Zero Trust** 설정 (필요시)
3. **WAF** 설정 (필요시)

## 14. 백업 및 복구

### 14.1 D1 백업
```bash
# D1 데이터 Export
wrangler d1 execute NKEY_DB --command ".dump" > backup.sql
```

### 14.2 R2 백업
1. **R2** → **Manage** → **Export**
2. 버킷 전체 다운로드

## 15. 성능 최적화

### 15.1 캐시 설정
```bash
# KV 캐시 TTL 설정
wrangler kv:namespace create "KV_CACHE" --preview
```

### 15.2 CDN 설정
1. **Speed** → **Optimization**
2. **Auto Minify** 활성화
3. **Brotli** 압축 활성화

---

## 📞 지원

- **Cloudflare 문서**: https://developers.cloudflare.com
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **GitHub Issues**: 프로젝트 저장소

## ✅ 체크리스트

- [ ] Cloudflare 계정 생성
- [ ] API 토큰 생성
- [ ] D1 데이터베이스 생성
- [ ] R2 버킷 생성
- [ ] KV 네임스페이스 생성
- [ ] Pages 프로젝트 생성
- [ ] Workers 배포
- [ ] 환경변수 설정
- [ ] 데이터 마이그레이션
- [ ] 기능 테스트
- [ ] 모니터링 설정

**설정 완료일**: ___________
**담당자**: ___________
