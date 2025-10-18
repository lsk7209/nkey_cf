# 배포 가이드

## 1. Supabase 설정

### 1.1 프로젝트 생성
1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름과 데이터베이스 비밀번호 설정
4. 리전 선택 (Asia Northeast - Seoul 권장)

### 1.2 데이터베이스 스키마 설정
1. Supabase 대시보드에서 "SQL Editor" 메뉴 선택
2. `supabase-schema.sql` 파일의 내용을 복사하여 실행
3. 테이블이 정상적으로 생성되었는지 확인

### 1.3 API 키 확인
1. "Settings" > "API" 메뉴에서 다음 정보 확인:
   - Project URL
   - anon public key

## 2. 네이버 검색광고 API 설정

### 2.1 계정 생성 및 API 키 발급
1. [네이버 검색광고 API](https://naver.github.io/searchad-apidoc/) 접속
2. 네이버 계정으로 로그인
3. "API 사용 신청" 진행
4. Access License와 Secret Key 발급
5. Customer ID 확인

### 2.2 API 사용량 확인
- RelKwdStat API는 속도 제한이 엄격함
- 429 오류 시 5분 대기 필요
- 일일 사용량 제한 확인

## 3. Vercel 배포

### 3.1 GitHub 저장소 생성
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/naver-keyword-finder.git
git push -u origin main
```

### 3.2 Vercel 프로젝트 연결
1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택
4. "Import" 클릭

### 3.3 환경변수 설정
Vercel 대시보드에서 "Settings" > "Environment Variables"에서 다음 변수들을 설정:

**필수 환경 변수:**
```
SEARCHAD_BASE=https://api.naver.com
SEARCHAD_API_KEY=your_access_license_here
SEARCHAD_SECRET=your_secret_key_here
SEARCHAD_CUSTOMER_ID=your_customer_id_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**환경 변수 설정 방법:**
1. Vercel 대시보드에서 프로젝트 선택
2. "Settings" 탭 클릭
3. "Environment Variables" 섹션에서 "Add New" 클릭
4. 각 변수명과 값을 입력
5. "Production", "Preview", "Development" 환경 모두에 적용
6. "Save" 클릭

**주의사항:**
- 모든 환경 변수는 반드시 설정해야 빌드가 성공합니다
- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트에서도 접근 가능합니다
- 환경 변수 설정 후 새로운 배포를 트리거해야 적용됩니다

### 3.4 배포 확인
1. "Deployments" 탭에서 배포 상태 확인
2. 배포 완료 후 도메인으로 접속하여 테스트

## 4. 로컬 개발 환경 설정

### 4.1 환경변수 파일 생성
```bash
cp env.example .env.local
```

### 4.2 환경변수 값 입력
`.env.local` 파일에 실제 API 키와 데이터베이스 정보 입력

### 4.3 개발 서버 실행
```bash
npm install
npm run dev
```

## 5. 트러블슈팅

### 5.1 네이버 API 오류
- **401/403 오류**: API 키, 시크릿, Customer ID 확인
- **429 오류**: API 호출 속도 제한, 5분 대기 후 재시도
- **시그니처 오류**: 타임스탬프와 URI 경로 확인

### 5.2 Supabase 연결 오류
- **연결 실패**: URL과 anon key 확인
- **테이블 없음**: SQL 스키마 실행 확인
- **권한 오류**: RLS 정책 확인

### 5.3 Vercel 배포 오류
- **빌드 실패**: 환경변수 설정 확인
- **런타임 오류**: API 라우트 로그 확인
- **타임아웃**: 함수 실행 시간 제한 확인

## 6. 모니터링

### 6.1 Vercel 대시보드
- 배포 상태 모니터링
- 함수 실행 로그 확인
- 에러 알림 설정

### 6.2 Supabase 대시보드
- 데이터베이스 사용량 모니터링
- API 호출 통계 확인
- 실시간 로그 확인

### 6.3 네이버 API 대시보드
- API 사용량 모니터링
- 오류 로그 확인
- 할당량 관리
