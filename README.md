# 황금키워드 탐색기

네이버 검색광고 API와 오픈검색 API를 활용한 키워드 리서치 플랫폼

## 기능

- **키워드 검색**: 최대 5개의 키워드를 동시에 검색
- **데이터 수집**: 네이버 SearchAd API + OpenAPI 병렬 호출
- **자동 저장**: 수집 결과를 Cloudflare D1에 자동 저장
- **데이터 관리**: 필터링, 정렬, CSV 다운로드 기능
- **실시간 분석**: 검색량, CTR, 경쟁도, 문서수, 잠재지수 분석

## 기술 스택

- **Frontend**: Next.js 14, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes (Edge Runtime)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Hosting**: Cloudflare Pages
- **APIs**: Naver SearchAd API, Naver OpenAPI

## 프로젝트 구조

```
├── app/
│   ├── api/
│   │   ├── keyword/route.ts      # 키워드 검색 API
│   │   ├── data/route.ts         # 데이터 조회 API
│   │   └── data.csv/route.ts     # CSV 다운로드 API
│   ├── data/page.tsx             # 데이터 관리 페이지
│   ├── page.tsx                  # 메인 페이지
│   ├── layout.tsx                # 레이아웃
│   └── globals.css               # 글로벌 스타일
├── lib/
│   ├── d1-client.ts              # D1 데이터베이스 클라이언트
│   ├── naver-api.ts              # Naver API 유틸리티
│   └── utils.ts                  # 공통 유틸리티
├── migrations/
│   └── 0001_init.sql            # 데이터베이스 스키마
├── wrangler.toml                 # Cloudflare 설정
└── package.json
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Naver SearchAd API
SEARCHAD_ACCESS_LICENSE=your_access_license
SEARCHAD_SECRET_KEY=your_secret_key
SEARCHAD_CUSTOMER_ID=your_customer_id

# Naver OpenAPI
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. Cloudflare 배포

```bash
# Wrangler 설치
npm install -g wrangler

# 로그인
wrangler login

# D1 데이터베이스 생성
wrangler d1 create nkey-db

# KV 네임스페이스 생성
wrangler kv:namespace create "CACHE"

# wrangler.toml 파일의 database_id와 kv id를 업데이트

# 배포
wrangler pages deploy
```

## API 엔드포인트

### POST /api/keyword

키워드 검색 및 데이터 수집

**요청:**
```json
{
  "hintKeywords": "풀빌라,강원도풀빌라,제주도풀빌라"
}
```

**응답:**
```json
[
  {
    "keyword": "풀빌라",
    "related": [
      {
        "rel_keyword": "강원도풀빌라",
        "pc_search": 1890,
        "mobile_search": 9280,
        "ctr_pc": 2.86,
        "ctr_mo": 4.45,
        "ad_count": 15,
        "comp_idx": "높음",
        "blog_count": 43120,
        "cafe_count": 5120,
        "news_count": 830,
        "web_count": 9410,
        "total_docs": 58480,
        "potential_score": 19.1,
        "source": "fresh"
      }
    ]
  }
]
```

### GET /api/data

저장된 데이터 조회

**쿼리 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `pageSize`: 페이지 크기 (기본값: 50)
- `query`: 키워드 검색
- `dateFilter`: 날짜 필터 (today, 7days, 30days)
- `compFilter`: 경쟁도 필터 (high, medium, low)
- `sortBy`: 정렬 필드 (기본값: fetched_at)
- `sortOrder`: 정렬 순서 (asc, desc)

### GET /api/data.csv

CSV 다운로드 (쿼리 파라미터는 /api/data와 동일)

## 데이터베이스 스키마

```sql
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_bucket TEXT NOT NULL,
  keyword TEXT NOT NULL,
  rel_keyword TEXT NOT NULL,
  pc_search INTEGER DEFAULT 0,
  mobile_search INTEGER DEFAULT 0,
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
  fetched_at TEXT NOT NULL
);
```

## 주요 기능

### 1. 키워드 검색
- 최대 5개 키워드 동시 검색
- 네이버 SearchAd API + OpenAPI 병렬 호출
- 실시간 데이터 수집 및 저장

### 2. 데이터 분석
- **검색량**: PC/모바일 검색량
- **CTR**: 클릭률 (PC/모바일)
- **경쟁도**: 높음/중간/낮음
- **문서수**: 블로그/카페/뉴스/웹 문서 수
- **잠재지수**: (검색량 / 문서수) * 100

### 3. 데이터 관리
- 필터링: 키워드, 날짜, 경쟁도
- 정렬: 최신순, 잠재지수, 검색량
- CSV 다운로드: UTF-8 BOM 포함
- 페이지네이션: 10/50/100개 선택

### 4. 캐시 및 성능
- KV 캐시: 6시간 TTL
- 쿨다운 처리: 429 에러 시 5분 대기
- 재시도 로직: 300ms → 600ms → 1200ms

## 라이선스

MIT License
