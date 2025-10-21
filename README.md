# 네이버 키워드 파인더

네이버 검색광고 API를 활용한 황금키워드 찾기 웹앱입니다.

> 🚀 **최신 업데이트**: Vercel 환경 최적화 및 UPSERT 방식으로 키워드 중복 방지 및 데이터 갱신 지원!

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
- 🔄 **UPSERT 방식**: 중복 키워드 자동 갱신 (기존 데이터 덮어쓰기)
- ⏱️ **Vercel 최적화**: 무료 플랜 제한에 맞춘 50개 키워드 배치 처리

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

### Vercel 환경변수 설정

**중요**: Vercel 대시보드에서 환경변수를 설정할 때는 **직접 값을 입력**해야 합니다. Secret 참조(`@secret`)는 사용하지 마세요.

#### 필수 환경변수
```
# 네이버 검색광고 API (기본)
SEARCHAD_BASE=https://api.naver.com
SEARCHAD_API_KEY=your_access_license_here
SEARCHAD_SECRET=your_secret_key_here
SEARCHAD_CUSTOMER_ID=your_customer_id_here

# 다중 API 키 (선택사항)
SEARCHAD_API_KEY_2=your_api_key_2_here
SEARCHAD_SECRET_2=your_secret_2_here
SEARCHAD_CUSTOMER_ID_2=your_customer_id_2_here
# ... (최대 5개까지)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 네이버 OpenAPI (문서수 수집용)
NAVER_CLIENT_ID=your_client_id_here
NAVER_CLIENT_SECRET=your_client_secret_here
# ... (최대 10개까지)
```

#### 환경변수 설정 방법
1. Vercel 대시보드 > 프로젝트 > Settings > Environment Variables
2. 각 환경변수를 직접 입력 (Production, Preview, Development 모두 설정)
3. 환경변수 변경 후 반드시 재배포 필요

### Vercel Functions 설정

#### maxDuration 설정
`vercel.json` 파일에서 함수 실행 시간 제한을 설정:

```json
{
  "functions": {
    "app/api/manual-collect/route.ts": {
      "maxDuration": 300
    },
    "app/api/auto-collect3/route.ts": {
      "maxDuration": 300
    }
  }
}
```

#### 제한사항
- **무료 플랜**: 최대 10초 (Hobby)
- **Pro 플랜**: 최대 60초
- **Enterprise**: 최대 900초

### 배포 후 확인사항

1. **환경변수 확인**
   - Vercel 대시보드에서 모든 환경변수가 올바르게 설정되었는지 확인
   - Production, Preview, Development 환경 모두 설정

2. **데이터베이스 연결 확인**
   - Supabase 대시보드에서 테이블 생성 확인
   - RLS 정책 설정 확인

3. **API 키 상태 확인**
   - 수동수집 페이지에서 API 키 상태 모니터링
   - 네이버 API 호출 테스트

4. **로그 모니터링**
   - Vercel Functions 로그에서 오류 확인
   - 브라우저 개발자 도구에서 네트워크 요청 확인

## 사용 방법

### 수동 수집 (Manual Collection)
1. **시드키워드 입력**: 수집하고 싶은 기본 키워드를 입력합니다.
2. **자동 수집**: 시스템이 자동으로 연관키워드를 찾아 수집합니다.
3. **실시간 진행**: 수집 진행 상황을 실시간으로 확인할 수 있습니다.
4. **결과 확인**: 수집된 키워드의 상세 지표와 문서수를 확인합니다.
5. **데이터 내보내기**: CSV 파일로 데이터를 다운로드할 수 있습니다.

### 자동 수집 (Auto Collection)
1. **자동 수집 시작**: 백그라운드에서 자동으로 키워드를 수집합니다.
2. **진행 상황 모니터링**: 실시간으로 수집 진행 상황을 확인할 수 있습니다.
3. **수집 중지**: 필요시 수집을 중지할 수 있습니다.
4. **결과 확인**: 수집된 데이터를 확인하고 분석할 수 있습니다.

### 데이터 관리
1. **키워드 검색**: 특정 키워드를 검색하여 데이터를 확인할 수 있습니다.
2. **필터링**: 검색량, CTR, 경쟁도 등으로 데이터를 필터링할 수 있습니다.
3. **정렬**: 다양한 기준으로 데이터를 정렬할 수 있습니다.
4. **CSV 내보내기**: 수집된 데이터를 CSV 파일로 다운로드할 수 있습니다.

### UPSERT 방식 활용
- **중복 키워드**: 동일한 키워드를 다시 수집하면 기존 데이터가 최신 정보로 업데이트됩니다.
- **데이터 갱신**: 키워드의 검색량, CTR 등이 변경되면 자동으로 갱신됩니다.
- **중복 방지**: 같은 키워드가 여러 번 저장되지 않습니다.

## API 제한사항

- 네이버 검색광고 API는 RelKwdStat(키워드 도구)에 대해 엄격한 속도 제한이 있습니다.
- 429 오류 발생 시 5분간 대기 후 재시도합니다.
- 한 번에 최대 5개의 힌트 키워드만 처리할 수 있습니다.
- 네이버 OpenAPI는 하루 25,000회 호출 제한이 있습니다 (문서수 조회용).
- API 호출 간격을 조절하여 제한을 준수합니다.

## 네이버 검색광고 API 구현 가이드

### API 엔드포인트 및 인증
- **Base URL**: `https://api.naver.com`
- **엔드포인트**: `GET /keywordstool`
- **인증 방식**: HMAC-SHA256 서명 기반

### 필수 헤더
```
X-Timestamp: {현재시간_Epoch_ms}
X-API-KEY: {Access_License}
X-Customer: {Customer_ID}
X-Signature: {Base64_HMAC_SHA256}
```

### 시그니처 생성 규칙
```typescript
// URI는 쿼리스트링 제외하고 순수 경로만 사용
const cleanUri = uri.split('?')[0];
const message = `${timestamp}.${method}.${cleanUri}`;
const signature = CryptoJS.HmacSHA256(message, secret);
return CryptoJS.enc.Base64.stringify(signature);
```

### 요청 파라미터
- `hintKeywords`: 힌트 키워드 (최대 5개, 쉼표 구분)
- `showDetail`: 상세 지표 포함 여부 (0/1)

### 응답 데이터 매핑
| 우리 컬럼 | 네이버 필드 | 설명 |
|-----------|-------------|------|
| 키워드 | `relKeyword` | 연관키워드 텍스트 |
| PC 검색수 | `monthlyPcQcCnt` | 최근 한 달 PC 검색수 |
| 모바일 검색수 | `monthlyMobileQcCnt` | 최근 한 달 모바일 검색수 |
| PC CTR | `monthlyAvePcCtr` | 최근 한 달 평균 클릭률(PC) |
| 모바일 CTR | `monthlyAveMobileCtr` | 최근 한 달 평균 클릭률(모바일) |
| 광고수 | `plAvgDepth` | 평균 노출 광고 개수 |
| 경쟁지수 | `compIdx` | 경쟁 정도(낮음/중간/높음) |

### 데이터 정규화
- 모든 수치가 문자열로 반환될 수 있음
- `< 10` 같은 문자열은 기호 제거 후 숫자 변환
- CTR은 백분율 값 문자열 (예: "2.86" → 2.86%)

### 오류 처리
- **401/403**: 시그니처/헤더 불일치 → 타임스탬프/서명 규칙 재검증
- **429**: 호출 속도 초과 → 5분 대기 후 재시도
- **네트워크 오류**: 지수 백오프로 재시도 (최대 3회)

## 트러블슈팅

### Vercel 환경에서의 수동수집 문제

#### 문제 상황
- 수동수집 시 "0개 처리, 0개 저장" 결과 발생
- 백그라운드 처리가 시작되었다고 표시되지만 실제로는 처리되지 않음
- Vercel Functions 로그에 아무 내용이 없음
- 504 Gateway Timeout 및 SyntaxError 발생

#### 원인 분석
1. **백그라운드 실행 문제**: Vercel Functions에서 `setTimeout`으로 백그라운드 실행하는 방식이 제대로 작동하지 않음
2. **타임아웃 문제**: 대량 키워드 처리 시 Vercel 무료 플랜의 10초 제한 초과
3. **메모리 부족**: 1000개 키워드 동시 처리 시 메모리 한계 도달

#### 해결 방법

##### 1. 백그라운드 실행 → 즉시 실행 변경
**이전 (문제 있던 방식):**
```typescript
// 즉시 응답 반환 후 백그라운드에서 실행
executeManualCollect(seedKeyword).catch(error => {
  console.error('백그라운드 실행 오류:', error)
})
return NextResponse.json({ status: 'started' })
```

**현재 (수정된 방식):**
```typescript
// 즉시 실행하여 완료 후 응답 반환
const result = await executeManualCollect(seedKeyword)
return NextResponse.json({ 
  status: 'completed', 
  result 
})
```

##### 2. 키워드 수집량 최적화
- **최대 키워드 수**: 1000개 → 50개로 제한
- **배치 크기**: 5개씩 처리
- **배치 간 대기**: 1초
- **동시성 제한**: 키워드 통계 1개, 문서수 1개

##### 3. UPSERT 방식 도입
- **중복 키워드 처리**: 기존 데이터 덮어쓰기
- **데이터 갱신**: 동일 키워드 재수집 시 최신 정보로 업데이트
- **중복 체크 제거**: 성능 향상

#### Vercel 환경 제약사항
1. **함수 실행 시간 제한**
   - 무료 플랜: 10초 (Hobby)
   - Pro 플랜: 60초
   - Enterprise: 900초

2. **백그라운드 작업 제한**
   - 함수가 응답을 반환한 후 백그라운드 작업이 중단될 수 있음
   - `setTimeout`, `setInterval` 등이 예상대로 작동하지 않을 수 있음

3. **메모리 제한**
   - 무료 플랜: 1024MB
   - Pro 플랜: 3008MB

#### 현재 최적화 설정
```typescript
// 수동수집 최적화 설정
const maxKeywords = 50;           // 최대 50개 키워드
const batchSize = 5;              // 5개씩 배치 처리
const batchDelay = 1000;          // 배치 간 1초 대기
const processingConcurrency = 1;   // 키워드 통계 동시성 1
const documentConcurrency = 1;    // 문서수 동시성 1
```

#### 성능 개선 결과
- **처리 시간**: 10초 이내 완료
- **메모리 사용량**: 1024MB 이하 유지
- **타임아웃 방지**: 504 에러 해결
- **데이터 갱신**: UPSERT로 중복 방지 및 업데이트

### UPSERT 방식 키워드 처리

#### UPSERT란?
UPSERT는 INSERT와 UPDATE를 결합한 데이터베이스 연산입니다:
- **키워드가 없으면**: 새로 삽입 (INSERT)
- **키워드가 있으면**: 기존 데이터 업데이트 (UPDATE)

#### 구현 방식
```typescript
// Supabase UPSERT 설정
const { error: upsertError } = await supabase
  .from('manual_collection_results')
  .upsert(insertData, { 
    onConflict: 'keyword',        // keyword 컬럼 기준으로 중복 체크
    ignoreDuplicates: false        // 중복 시 업데이트 (무시하지 않음)
  })
```

#### 장점
1. **데이터 갱신**: 기존 키워드의 최신 정보로 자동 업데이트
2. **중복 방지**: 동일한 키워드가 여러 번 저장되지 않음
3. **성능 향상**: 중복 체크 로직 제거로 처리 속도 개선
4. **데이터 일관성**: 항상 최신 키워드 정보 유지

#### 처리 예시
```
1차 수집: "신촌맛집" → 검색수 1000, CTR 2.5% (INSERT)
2차 수집: "신촌맛집" → 검색수 1200, CTR 3.1% (UPDATE)
결과: 최신 데이터(1200, 3.1%)로 갱신됨
```

### Vercel 무료 플랜 최적화

#### 제약사항
- **실행 시간**: 최대 10초
- **메모리**: 최대 1024MB
- **동시 실행**: 제한적

#### 최적화 전략
1. **키워드 수 제한**: 50개로 제한
2. **배치 처리**: 5개씩 나누어 처리
3. **동시성 제한**: 1개씩 순차 처리
4. **대기 시간**: 배치 간 1초 대기
5. **메모리 관리**: 스트리밍 처리 및 가비지 컬렉션

#### 성능 모니터링
```typescript
// 처리 시간 측정
const startTime = Date.now()
// ... 처리 로직 ...
const endTime = Date.now()
console.log(`처리 시간: ${endTime - startTime}ms`)

// 메모리 사용량 체크
if (process.memoryUsage().heapUsed > 800 * 1024 * 1024) {
  console.warn('메모리 사용량이 높습니다:', process.memoryUsage())
}
```

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
#