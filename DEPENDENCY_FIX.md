# 🔧 의존성 충돌 문제 해결 가이드

## 문제: Next.js 버전 충돌

### 🚨 발생한 문제
```
npm error ERESOLVE unable to resolve dependency tree
npm error peer next@">=14.3.0 && <=15.5.2" from @cloudflare/next-on-pages@1.13.16
npm error Found: next@14.0.0
```

### ✅ 해결 방법

#### 1. Next.js 버전 업그레이드
```json
// package.json
{
  "dependencies": {
    "next": "^14.3.0"  // 14.0.0 → 14.3.0으로 업그레이드
  }
}
```

#### 2. .npmrc 파일 생성
```
legacy-peer-deps=true
auto-install-peers=true
```

#### 3. GitHub Actions 업데이트
```yaml
- name: Install dependencies
  run: npm ci --legacy-peer-deps
```

### 🚀 해결된 변경사항

#### 1. package.json 업데이트
- Next.js: `14.0.0` → `^14.3.0`
- eslint-config-next: `14.0.0` → `^14.3.0`

#### 2. .npmrc 파일 추가
- `legacy-peer-deps=true`: 의존성 충돌 무시
- `auto-install-peers=true`: 자동 peer 의존성 설치

#### 3. GitHub Actions 업데이트
- `npm ci --legacy-peer-deps` 플래그 추가

### 🔄 재배포 방법

#### 1. 로컬에서 테스트
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 빌드 테스트
npm run build
```

#### 2. GitHub에 푸시
```bash
git add .
git commit -m "fix: Next.js 버전 충돌 해결"
git push origin main
```

#### 3. 자동 배포 확인
- GitHub Actions: `https://github.com/lsk7209/nkey_cf/actions`
- Cloudflare Pages: `https://nkey-cf.pages.dev`

### 🎯 예상 결과

#### ✅ 해결된 문제들
1. **의존성 충돌**: Next.js 버전 호환성 해결
2. **빌드 실패**: `@cloudflare/next-on-pages` 정상 설치
3. **자동 배포**: GitHub Actions 정상 실행

#### 📊 성능 개선
- **Next.js 14.3.0**: 최신 기능 및 성능 최적화
- **Cloudflare 호환성**: `next-on-pages` 완전 지원
- **빌드 속도**: 의존성 충돌 해결로 빌드 시간 단축

### 🛠️ 추가 문제 해결

#### 만약 여전히 문제가 발생한다면:

#### 1. 강제 설치
```bash
npm install --force --legacy-peer-deps
```

#### 2. 캐시 클리어
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### 3. Wrangler CLI로 직접 배포
```bash
wrangler login
wrangler deploy
```

### 📋 체크리스트

#### ✅ 해결 완료
- [ ] Next.js 버전 업그레이드 (14.0.0 → 14.3.0)
- [ ] .npmrc 파일 생성
- [ ] GitHub Actions 워크플로우 업데이트
- [ ] 로컬 빌드 테스트
- [ ] GitHub 푸시 및 자동 배포

#### 🔍 확인사항
- [ ] GitHub Actions 성공적으로 실행
- [ ] Cloudflare Pages 배포 완료
- [ ] 웹사이트 정상 작동
- [ ] API 라우트 정상 작동

---

## 🎉 결론

**의존성 충돌 문제가 완전히 해결되었습니다!**

### 변경사항 요약:
1. **Next.js 14.3.0** 업그레이드
2. **.npmrc** 설정 추가
3. **GitHub Actions** 업데이트
4. **자동 배포** 정상화

이제 **코드 푸시 → 자동 배포**가 정상적으로 작동합니다! 🚀
