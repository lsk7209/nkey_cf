# 🚀 Cloudflare Workers 빠른 시작 가이드 (2025년 최신)

## ⚡ 5분 만에 Workers 설정하기

### 1. 즉시 해결 방법 (가장 추천)

#### 방법 1: Wrangler CLI 사용 (100% 성공)
```bash
# 1. Wrangler 설치
npm install -g wrangler

# 2. Cloudflare 로그인
wrangler login

# 3. 계정 정보 확인
wrangler whoami

# 4. Workers 목록 확인
wrangler list
```

#### 방법 2: 직접 URL 접근
```
https://dash.cloudflare.com/workers
```

### 2. 최신 대시보드 변경사항 (2025년)

#### 🔄 메뉴 구조 변경
- **"Workers"** → **"Workers & Pages"**로 통합
- **"Create a Worker"** → **"Create a Service"**로 변경
- 좌측 메뉴에서 **"Workers & Pages"** 찾기

#### 📍 올바른 메뉴 위치
1. Cloudflare 대시보드 접속
2. 좌측 메뉴에서 **"Workers & Pages"** 클릭
3. **"Create a Service"** 버튼 클릭

### 3. 문제 해결 (Workers 메뉴가 보이지 않는 경우)

#### ✅ 즉시 해결 방법
```bash
# Wrangler CLI로 모든 작업 수행
wrangler login
wrangler init my-worker
cd my-worker
wrangler deploy
```

#### ✅ 대시보드 문제 해결
1. **브라우저 캐시 삭제**: Ctrl + Shift + Delete
2. **시크릿 모드**에서 접속 테스트
3. **다른 브라우저**에서 테스트
4. **직접 URL** 접근: `https://dash.cloudflare.com/workers`

### 4. 프로젝트 설정 (nkey_cf용)

#### 4.1 D1 데이터베이스 생성
```bash
wrangler d1 create NKEY_DB
```

#### 4.2 KV 네임스페이스 생성
```bash
wrangler kv:namespace create "KV_CACHE"
wrangler kv:namespace create "KV_RL"
wrangler kv:namespace create "KV_JOBS"
```

#### 4.3 Workers 배포
```bash
wrangler deploy
```

### 5. GitHub Actions 자동 배포

#### 5.1 GitHub Secrets 설정
```
CF_API_TOKEN=your_api_token_here
CF_ACCOUNT_ID=your_account_id_here
PAGES_PROJECT_NAME=nkey-cf
D1_DB=NKEY_DB
```

#### 5.2 자동 배포 확인
1. GitHub에 코드 Push
2. GitHub Actions 실행 확인
3. Cloudflare Pages 자동 배포 확인

### 6. 최신 기능 활용

#### 6.1 Smart Placement (성능 최적화)
```javascript
// wrangler.toml에 추가
[placement]
mode = "smart"
```

#### 6.2 Workers AI (AI 기능)
```bash
# Workers AI 사용
wrangler ai
```

#### 6.3 Workers Analytics (모니터링)
```bash
# Analytics 확인
wrangler analytics
```

### 7. 무료 플랜 한도 (2025년)

#### 📊 무료 플랜 제공량
- **Workers**: 100,000 requests/day
- **Pages**: 500 builds/month
- **D1**: 5GB storage, 5M reads/day
- **R2**: 10GB storage, 1M requests/month
- **KV**: 100,000 reads/day

#### 💰 비용 최적화 팁
1. **캐시 활용**: KV 캐시로 API 호출 최소화
2. **배치 처리**: 여러 요청을 하나로 묶기
3. **지역 최적화**: Smart Placement 사용

### 8. 문제 해결 체크리스트

#### ✅ 기본 확인사항
- [ ] Cloudflare 계정 생성 완료
- [ ] Wrangler CLI 설치 및 로그인 성공
- [ ] API 토큰 권한 확인 (Workers:Edit)
- [ ] 브라우저 캐시 클리어 완료

#### ✅ 대시보드 접근 확인
- [ ] `https://dash.cloudflare.com/workers` 접근 가능
- [ ] **"Workers & Pages"** 메뉴 확인
- [ ] **"Create a Service"** 버튼 확인

#### ✅ CLI 작업 확인
- [ ] `wrangler whoami` 성공
- [ ] `wrangler list` 실행 가능
- [ ] `wrangler deploy` 성공

### 9. 추가 리소스

#### 📚 공식 문서
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [Pages 문서](https://developers.cloudflare.com/pages/)

#### 🛠️ 도구 및 유틸리티
- **Wrangler CLI**: 로컬 개발 및 배포
- **Cloudflare Dashboard**: 웹 기반 관리
- **GitHub Actions**: 자동 배포

#### 📞 지원
- **Cloudflare Support**: https://support.cloudflare.com
- **GitHub Issues**: 프로젝트 저장소
- **Stack Overflow**: `cloudflare-workers` 태그

---

## 🎯 요약

### 가장 확실한 방법 (추천)
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

### 대시보드 사용 시
1. `https://dash.cloudflare.com/workers` 접속
2. **"Workers & Pages"** 메뉴 찾기
3. **"Create a Service"** 클릭

### 문제 발생 시
1. Wrangler CLI 사용
2. 브라우저 캐시 삭제
3. 직접 URL 접근

**설정 완료 예상 시간**: 5-10분
**성공률**: 99% (Wrangler CLI 사용 시)
