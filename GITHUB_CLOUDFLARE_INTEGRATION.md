# 🔗 GitHub → Cloudflare 자동 연동 가이드

## 🚀 완전 자동화된 배포 파이프라인 구축

### 1. GitHub 저장소 준비 (이미 완료)

✅ **현재 상태**: `https://github.com/lsk7209/nkey_cf` 저장소 생성 완료

### 2. Cloudflare Pages 자동 연동 설정

#### 2.1 Cloudflare Pages 프로젝트 생성
1. **Cloudflare 대시보드** → **Workers & Pages**
2. **Create a project** 클릭
3. **Connect to Git** 선택
4. **GitHub** 선택
5. **Authorize Cloudflare** 클릭 (GitHub 권한 부여)
6. **lsk7209/nkey_cf** 저장소 선택
7. **Begin setup** 클릭

#### 2.2 빌드 설정
```
Project name: nkey-cf
Production branch: main
Framework preset: Next.js
Build command: npm run build
Build output directory: .vercel/output/static
Root directory: / (기본값)
```

#### 2.3 환경변수 설정
**Environment variables** 섹션에서 다음 추가:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. GitHub Actions 자동 배포 설정

#### 3.1 GitHub Secrets 설정
**GitHub 저장소** → **Settings** → **Secrets and variables** → **Actions**:

```
CF_API_TOKEN=your_cloudflare_api_token
CF_ACCOUNT_ID=your_cloudflare_account_id
PAGES_PROJECT_NAME=nkey-cf
D1_DB=NKEY_DB
```

#### 3.2 자동 배포 워크플로우 (이미 생성됨)
`.github/workflows/cf-deploy.yml` 파일이 이미 생성되어 있습니다!

### 4. Cloudflare Workers 자동 배포

#### 4.1 Wrangler 설정
```bash
# Wrangler 로그인
wrangler login

# 프로젝트 초기화
wrangler init

# Workers 배포
wrangler deploy
```

#### 4.2 자동 배포 확인
GitHub에 코드를 Push하면 자동으로:
1. **GitHub Actions** 실행
2. **Cloudflare Pages** 배포
3. **Cloudflare Workers** 배포
4. **D1 마이그레이션** 실행

### 5. 완전 자동화된 워크플로우

#### 5.1 코드 변경 시 자동 배포
```bash
# 로컬에서 코드 수정
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main

# 자동으로 실행되는 과정:
# 1. GitHub Actions 트리거
# 2. Next.js 빌드
# 3. Cloudflare Pages 배포
# 4. Workers 배포
# 5. D1 마이그레이션
```

#### 5.2 배포 상태 확인
1. **GitHub Actions**: `https://github.com/lsk7209/nkey_cf/actions`
2. **Cloudflare Pages**: `https://dash.cloudflare.com/pages`
3. **Cloudflare Workers**: `https://dash.cloudflare.com/workers`

### 6. 환경별 배포 전략

#### 6.1 브랜치별 자동 배포
```yaml
# .github/workflows/cf-deploy.yml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
```

#### 6.2 환경별 설정
- **main 브랜치**: Production 배포
- **develop 브랜치**: Staging 배포
- **PR**: Preview 배포

### 7. 모니터링 및 알림 설정

#### 7.1 GitHub Actions 알림
```yaml
# 배포 성공/실패 시 Slack 알림
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### 7.2 Cloudflare Analytics
1. **Analytics & Logs** → **Web Analytics**
2. **Real User Monitoring** 활성화
3. **Workers Analytics** 확인

### 8. 문제 해결 및 디버깅

#### 8.1 배포 실패 시 확인사항
```bash
# GitHub Actions 로그 확인
# 1. GitHub 저장소 → Actions 탭
# 2. 실패한 워크플로우 클릭
# 3. 로그 확인

# Cloudflare 배포 상태 확인
wrangler whoami
wrangler list
wrangler tail
```

#### 8.2 일반적인 문제 해결
1. **권한 문제**: API 토큰 권한 확인
2. **빌드 실패**: Node.js 버전, 의존성 확인
3. **배포 실패**: 환경변수, 설정 확인

### 9. 고급 자동화 설정

#### 9.1 조건부 배포
```yaml
# 특정 파일 변경 시에만 배포
- name: Check for changes
  id: changes
  uses: dorny/paths-filter@v2
  with:
    filters: |
      api:
        - 'src/app/api/**'
      workers:
        - 'workers/**'
```

#### 9.2 롤백 자동화
```yaml
# 배포 실패 시 자동 롤백
- name: Rollback on failure
  if: failure()
  run: |
    git revert HEAD
    git push origin main
```

### 10. 성능 최적화

#### 10.1 빌드 캐시 활용
```yaml
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

#### 10.2 병렬 배포
```yaml
# Pages와 Workers 동시 배포
strategy:
  matrix:
    service: [pages, workers]
```

### 11. 보안 설정

#### 11.1 Secrets 관리
```bash
# 민감한 정보는 GitHub Secrets에 저장
# wrangler.toml에는 ID만 저장
```

#### 11.2 접근 제어
```yaml
# 특정 브랜치에서만 배포
if: github.ref == 'refs/heads/main'
```

### 12. 완전 자동화 체크리스트

#### ✅ GitHub 설정
- [ ] 저장소 생성 완료
- [ ] GitHub Actions 활성화
- [ ] Secrets 설정 완료
- [ ] 워크플로우 파일 생성 완료

#### ✅ Cloudflare 설정
- [ ] Pages 프로젝트 생성
- [ ] Workers 설정 완료
- [ ] D1 데이터베이스 생성
- [ ] KV 네임스페이스 생성

#### ✅ 자동 배포 테스트
- [ ] 코드 Push 테스트
- [ ] GitHub Actions 실행 확인
- [ ] Cloudflare 배포 확인
- [ ] 기능 테스트 완료

### 13. 최종 배포 명령어

#### 13.1 로컬에서 배포
```bash
# 1. 코드 수정
git add .
git commit -m "feat: 새로운 기능"
git push origin main

# 2. 자동 배포 확인
# GitHub Actions: https://github.com/lsk7209/nkey_cf/actions
# Cloudflare Pages: https://nkey-cf.pages.dev
# Cloudflare Workers: https://dash.cloudflare.com/workers
```

#### 13.2 배포 상태 확인
```bash
# GitHub Actions 상태
gh run list

# Cloudflare 배포 상태
wrangler pages deployment list
wrangler list
```

---

## 🎯 요약

### 완전 자동화된 배포 파이프라인
1. **GitHub에 코드 Push** → **자동으로 Cloudflare 배포**
2. **GitHub Actions** → **빌드 및 배포 자동화**
3. **Cloudflare Pages** → **웹사이트 자동 배포**
4. **Cloudflare Workers** → **API 및 Cron 자동 배포**

### 설정 완료 후
- 코드 수정 → `git push` → 자동 배포
- GitHub Actions에서 배포 상태 확인
- Cloudflare 대시보드에서 서비스 확인

**완전 자동화 완료!** 🚀
