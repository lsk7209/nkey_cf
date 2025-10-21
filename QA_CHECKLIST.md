# Cloudflare 마이그레이션 QA 체크리스트

## 🚀 배포 전 체크리스트

### 1. 환경 설정
- [ ] Cloudflare 계정 생성 및 API 토큰 발급
- [ ] D1 데이터베이스 생성 및 ID 확인
- [ ] R2 버킷 생성 및 권한 설정
- [ ] KV 네임스페이스 생성 (cache, rl, jobs)
- [ ] Pages 프로젝트 생성
- [ ] 환경변수 설정 (wrangler.toml, GitHub Secrets)

### 2. 데이터 마이그레이션
- [ ] Supabase에서 데이터 Export (CSV)
- [ ] D1 마이그레이션 실행
- [ ] 데이터 검증 (레코드 수, 샘플 데이터)
- [ ] 인덱스 생성 확인

### 3. 빌드 및 배포
- [ ] 로컬 빌드 테스트 (`npm run build`)
- [ ] Next on Pages 빌드 확인
- [ ] GitHub Actions 워크플로우 테스트
- [ ] Pages 배포 확인
- [ ] Workers 배포 확인

### 4. 기능 테스트
- [ ] 수동수집 기능 테스트
- [ ] 자동수집3 기능 테스트
- [ ] 데이터 조회/필터링 테스트
- [ ] API 키 관리 테스트
- [ ] Cron Worker 실행 테스트

### 5. 성능 및 보안
- [ ] Edge Runtime 동작 확인
- [ ] 캐시 전략 테스트
- [ ] 레이트리밋 테스트
- [ ] 보안 헤더 확인
- [ ] SSL/TLS 설정 확인

## 🔧 배포 후 체크리스트

### 1. 기본 기능
- [ ] 홈페이지 접근 가능
- [ ] 수동수집 페이지 로드
- [ ] 자동수집3 페이지 로드
- [ ] 데이터 페이지 로드
- [ ] 설정 페이지 로드

### 2. API 엔드포인트
- [ ] `/api/manual-collect` POST 테스트
- [ ] `/api/auto-collect3` POST 테스트
- [ ] `/api/auto-collect3-status` GET 테스트
- [ ] `/api/auto-collect3-stop` POST 테스트
- [ ] `/api/data` GET/POST 테스트

### 3. 데이터베이스
- [ ] D1 연결 확인
- [ ] 데이터 조회 성능 테스트
- [ ] 데이터 저장 테스트
- [ ] 트랜잭션 처리 확인

### 4. 외부 서비스
- [ ] 네이버 API 연동 테스트
- [ ] API 키 로테이션 테스트
- [ ] 문서수 수집 테스트
- [ ] Slack 알림 테스트 (선택사항)

### 5. 모니터링
- [ ] Cloudflare 대시보드 확인
- [ ] 로그 모니터링 설정
- [ ] 알림 설정 확인
- [ ] 성능 메트릭 확인

## 🐛 문제 해결 가이드

### 일반적인 문제
1. **빌드 실패**: Node.js 버전, 의존성 확인
2. **배포 실패**: API 토큰, 권한 확인
3. **데이터베이스 오류**: D1 바인딩, 마이그레이션 확인
4. **API 오류**: 환경변수, 네트워크 확인

### 로그 확인
```bash
# Wrangler 로그 확인
wrangler tail

# Pages 로그 확인
wrangler pages deployment tail

# D1 쿼리 확인
wrangler d1 execute NKEY_DB --command "SELECT COUNT(*) FROM manual_collection_results;"
```

### 성능 최적화
1. **캐시 설정**: KV 캐시 TTL 조정
2. **데이터베이스**: 인덱스 최적화
3. **API 호출**: 배치 크기 조정
4. **메모리 사용**: 가비지 컬렉션 확인

## 📊 성능 벤치마크

### 목표 성능
- 페이지 로드 시간: < 2초
- API 응답 시간: < 1초
- 데이터베이스 쿼리: < 500ms
- 동시 사용자: 100+ 명

### 모니터링 지표
- 응답 시간 (Response Time)
- 처리량 (Throughput)
- 오류율 (Error Rate)
- 가용성 (Availability)

## 🔄 롤백 계획

### 문제 발생 시
1. **즉시 조치**: Cloudflare 대시보드에서 Workers 비활성화
2. **데이터 백업**: D1 데이터 Export
3. **이전 버전 복구**: GitHub에서 이전 커밋으로 롤백
4. **Vercel 복구**: 기존 Vercel 배포로 임시 복구

### 롤백 절차
```bash
# 1. 이전 커밋으로 체크아웃
git checkout main

# 2. Vercel 재배포
vercel --prod

# 3. 도메인 재설정
# 4. 데이터 동기화
```

## 📞 지원 연락처

- **Cloudflare 지원**: https://support.cloudflare.com
- **GitHub Issues**: 프로젝트 저장소
- **개발팀**: 내부 Slack 채널

## 📝 체크리스트 완료 확인

- [ ] 모든 배포 전 체크리스트 완료
- [ ] 모든 배포 후 체크리스트 완료
- [ ] 성능 벤치마크 달성
- [ ] 모니터링 설정 완료
- [ ] 롤백 계획 수립 완료

**체크리스트 완료일**: ___________
**담당자**: ___________
**승인자**: ___________
