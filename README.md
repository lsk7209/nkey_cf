# 네이버 키워드 파인더

네이버 검색광고 API를 활용한 황금키워드 찾기 웹앱입니다.

> 🚀 **최신 업데이트**: 실시간 배치 저장 시스템으로 데이터 손실 방지 및 10배 속도 향상!

## 주요 기능

- 🔍 **대량 키워드 수집**: 다중 API 키 로테이션으로 최대 125,000회/일 API 호출 가능
- 🚀 **3단계 수집 알고리즘**: 
  - 1차: 기본 연관키워드 수집
  - 2차: 수집된 키워드를 힌트로 사용한 추가 수집 (병렬 처리)
  - 3차: 더 깊이 있는 키워드 수집 (병렬 처리)
  - **모든 키워드는 네이버 검색광고 API에서 실제로 제공하는 키워드만 수집**
- 📊 **상세 지표 분석**: 검색량, 클릭수, CTR, 경쟁도 등 상세한 데이터 제공
- 🔑 **API 키 상태 모니터링**: 각 API 키의 사용량과 남은 호출 수 실시간 확인
- 💾 **데이터 저장**: Supabase를 통한 안전한 데이터 저장 및 관리
- ⚡ **배치 처리**: 대량의 키워드를 효율적으로 수집
- 📈 **CSV 내보내기**: 수집된 데이터를 CSV 파일로 다운로드

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **API**: 네이버 검색광고 API (RelKwdStat)

## 설치 및 실행

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd naver-keyword-finder
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 네이버 검색광고 API 설정 (기본 키)
SEARCHAD_BASE=https://api.naver.com
SEARCHAD_API_KEY=your_access_license_here
SEARCHAD_SECRET=your_secret_key_here
SEARCHAD_CUSTOMER_ID=your_customer_id_here

# 다중 API 키 설정 (황금 키워드 대량 수집용)
SEARCHAD_API_KEY_2=your_api_key_2_here
SEARCHAD_SECRET_2=your_secret_2_here
SEARCHAD_CUSTOMER_ID_2=your_customer_id_2_here

SEARCHAD_API_KEY_3=your_api_key_3_here
SEARCHAD_SECRET_3=your_secret_3_here
SEARCHAD_CUSTOMER_ID_3=your_customer_id_3_here

SEARCHAD_API_KEY_4=your_api_key_4_here
SEARCHAD_SECRET_4=your_secret_4_here
SEARCHAD_CUSTOMER_ID_4=your_customer_id_4_here

SEARCHAD_API_KEY_5=your_api_key_5_here
SEARCHAD_SECRET_5=your_secret_5_here
SEARCHAD_CUSTOMER_ID_5=your_customer_id_5_here

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성하세요.
2. SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하세요.
3. 프로젝트 설정에서 URL과 anon key를 복사하여 환경변수에 설정하세요.

### 5. 네이버 검색광고 API 설정

1. [네이버 검색광고 API](https://naver.github.io/searchad-apidoc/)에서 계정을 생성하세요.
2. Access License와 Secret Key를 발급받으세요.
3. Customer ID를 확인하세요.

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 배포

### Vercel 배포

1. [Vercel](https://vercel.com)에 계정을 생성하고 프로젝트를 연결하세요.
2. 환경변수를 Vercel 대시보드에서 설정하세요.
3. 자동으로 배포됩니다.

### GitHub 연동

1. GitHub 저장소에 코드를 푸시하세요.
2. Vercel에서 GitHub 저장소를 연결하세요.
3. 자동 배포가 설정됩니다.

## 사용 방법

1. **키워드 수집 시작**: 시드키워드를 입력하여 새로운 수집 세션을 생성합니다.
2. **수집 진행**: 네이버 API를 통해 연관키워드와 지표를 자동으로 수집합니다.
3. **문서수 수집**: 각 키워드에 대해 블로그, 뉴스, 웹문서, 카페 문서수를 자동으로 수집합니다.
4. **결과 확인**: 수집된 키워드의 상세 지표와 문서수를 확인하고 분석합니다.
5. **데이터 내보내기**: CSV 파일로 데이터를 다운로드할 수 있습니다.

## API 제한사항

- 네이버 검색광고 API는 RelKwdStat(키워드 도구)에 대해 엄격한 속도 제한이 있습니다.
- 429 오류 발생 시 5분간 대기 후 재시도합니다.
- 한 번에 최대 5개의 힌트 키워드만 처리할 수 있습니다.
- 네이버 OpenAPI는 하루 25,000회 호출 제한이 있습니다 (문서수 조회용).
- API 호출 간격을 조절하여 제한을 준수합니다.

## 트러블슈팅

### API 500 에러 (collections 엔드포인트)

API에서 500 에러가 발생하는 경우 다음을 확인하세요:

1. **Supabase 환경 변수 확인**
   - `NEXT_PUBLIC_SUPABASE_URL`이 올바르게 설정되었는지 확인
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 올바르게 설정되었는지 확인
   - Vercel 대시보드에서 환경 변수가 모든 환경(Production, Preview, Development)에 적용되었는지 확인

2. **Supabase 데이터베이스 스키마 확인**
   - Supabase 대시보드의 SQL Editor에서 `supabase-schema.sql` 실행 확인
   - `keyword_collections` 테이블이 생성되었는지 확인
   - `keywords` 테이블이 생성되었는지 확인
   - **수동수집 데이터 저장을 위해 `add-manual-collection-table.sql` 실행 필요**

3. **Vercel 로그 확인**
   - Vercel 대시보드 > Functions > 로그에서 상세한 에러 메시지 확인
   - 브라우저 개발자 도구 > Network 탭에서 응답 본문의 `error` 필드 확인

### 데이터 메뉴 500 에러 (manual_collection_results 테이블 없음)

데이터 메뉴에서 500 에러가 발생하는 경우:

1. **Supabase SQL Editor에서 테이블 생성**
   - Supabase 대시보드 > SQL Editor로 이동
   - `add-manual-collection-table.sql` 파일의 내용을 복사하여 실행
   - 또는 다음 SQL을 직접 실행:

```sql
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
  raw_json TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 및 RLS 정책 설정
CREATE INDEX idx_manual_results_seed_keyword ON manual_collection_results(seed_keyword);
CREATE INDEX idx_manual_results_keyword ON manual_collection_results(keyword);
CREATE INDEX idx_manual_results_total_search ON manual_collection_results(total_search DESC);
CREATE INDEX idx_manual_results_created_at ON manual_collection_results(created_at DESC);

ALTER TABLE manual_collection_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for all users" ON manual_collection_results FOR ALL USING (true);
```

2. **테이블 생성 확인**
   - Supabase 대시보드 > Table Editor에서 `manual_collection_results` 테이블이 생성되었는지 확인

### 문서수 기능을 위한 환경변수 설정

문서수 수집 기능을 사용하려면 네이버 OpenAPI 키가 필요합니다:

1. **네이버 개발자 센터에서 OpenAPI 키 발급**
   - [네이버 개발자 센터](https://developers.naver.com/) 접속
   - 애플리케이션 등록 후 Client ID, Client Secret 발급

2. **Vercel 환경변수 설정**
   ```
   NAVER_CLIENT_ID=your_client_id_here
   NAVER_CLIENT_SECRET=your_client_secret_here
   ```

3. **기존 테이블에 문서수 컬럼 추가**
   - Supabase SQL Editor에서 `add-document-count-columns.sql` 실행
   - 또는 다음 SQL 직접 실행:

```sql
ALTER TABLE manual_collection_results 
ADD COLUMN IF NOT EXISTS blog_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS news_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS webkr_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cafe_count INTEGER DEFAULT 0;
```

4. **환경 변수 재배포**
   - 환경 변수 변경 후 반드시 재배포 필요
   - Vercel 대시보드 > Deployments > Redeploy

### favicon.ico 404 에러

이 에러는 무시해도 되지만, 해결하려면:
- `public/favicon.svg` 파일이 생성되어 있는지 확인
- 배포 후 캐시를 지우고 페이지 새로고침

## 라이선스

MIT License

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
#   n k e y 4 
 
 #   n k e y 5 
 
 