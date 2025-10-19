interface OpenApiKeyInfo {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  dailyUsage: number;
  lastUsed: number; // timestamp
  isActive: boolean;
  remaining: number; // 25000 - dailyUsage
}

export class OpenApiKeyManager {
  private apiKeys: OpenApiKeyInfo[] = [];
  private readonly DAILY_LIMIT = 25000;

  constructor() {
    this.loadApiKeys();
    // 매일 자정 사용량 초기화 (실제 환경에서는 cron job 등으로 관리)
    if (typeof window === 'undefined') { // 서버 사이드에서만 실행
      setInterval(() => this.resetDailyUsage(), 24 * 60 * 60 * 1000);
    }
  }

  private loadApiKeys() {
    // 기본 OpenAPI 키 로드
    if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
      this.apiKeys.push({
        id: 'default',
        name: '기본 OpenAPI 키',
        clientId: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        dailyUsage: 0,
        lastUsed: 0,
        isActive: true,
        remaining: this.DAILY_LIMIT,
      });
    }

    // 추가 OpenAPI 키 로드 (NAVER_CLIENT_ID_2, _3, ...)
    for (let i = 2; i <= 10; i++) { // 최대 10개 키 지원
      const clientId = process.env[`NAVER_CLIENT_ID_${i}`];
      const clientSecret = process.env[`NAVER_CLIENT_SECRET_${i}`];

      if (clientId && clientSecret) {
        this.apiKeys.push({
          id: `openapi_${i}`,
          name: `OpenAPI 키 ${i}`,
          clientId,
          clientSecret,
          dailyUsage: 0,
          lastUsed: 0,
          isActive: true,
          remaining: this.DAILY_LIMIT,
        });
      }
    }

    console.log(`OpenAPI 키 매니저 초기화: ${this.apiKeys.length}개 키 활성화`);
  }

  private resetDailyUsage() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) { // 자정
      this.apiKeys.forEach(key => {
        key.dailyUsage = 0;
        key.isActive = true;
        key.remaining = this.DAILY_LIMIT;
      });
      console.log('모든 OpenAPI 키 일일 사용량 초기화.');
    }
  }

  getAvailableApiKey(): OpenApiKeyInfo | null {
    // 활성화된 키 중 가장 적게 사용했거나 가장 오래 전에 사용한 키를 선택
    const availableKeys = this.apiKeys.filter(key => key.isActive && key.dailyUsage < this.DAILY_LIMIT);

    if (availableKeys.length === 0) {
      return null;
    }

    // 사용량이 가장 적은 키 우선, 같으면 가장 오래 전에 사용한 키
    availableKeys.sort((a, b) => {
      if (a.dailyUsage !== b.dailyUsage) {
        return a.dailyUsage - b.dailyUsage;
      }
      return a.lastUsed - b.lastUsed;
    });

    return availableKeys[0];
  }

  // 여러 API 키를 동시에 가져오기 (병렬 처리용)
  getAvailableApiKeys(count: number): OpenApiKeyInfo[] {
    const availableKeys = this.apiKeys.filter(key => key.isActive && key.dailyUsage < this.DAILY_LIMIT);

    if (availableKeys.length === 0) {
      return [];
    }

    // 사용량과 마지막 사용 시간을 고려하여 정렬
    const sortedKeys = availableKeys.sort((a, b) => {
      if (a.dailyUsage !== b.dailyUsage) {
        return a.dailyUsage - b.dailyUsage;
      }
      return a.lastUsed - b.lastUsed;
    });

    // 요청한 개수만큼 반환 (최대 사용 가능한 키 수)
    return sortedKeys.slice(0, Math.min(count, availableKeys.length));
  }

  incrementUsage(keyId: string) {
    const key = this.apiKeys.find(k => k.id === keyId);
    if (key) {
      key.dailyUsage++;
      key.lastUsed = Date.now();
      key.remaining = this.DAILY_LIMIT - key.dailyUsage;
      if (key.dailyUsage >= this.DAILY_LIMIT) {
        key.isActive = false;
        console.warn(`OpenAPI 키 ${key.name} (ID: ${key.id}) 일일 한도 초과로 비활성화.`);
      }
    }
  }

  deactivateApiKey(keyId: string) {
    const key = this.apiKeys.find(k => k.id === keyId);
    if (key) {
      key.isActive = false;
      console.warn(`OpenAPI 키 ${key.name} (ID: ${key.id}) 수동 비활성화 (429 에러).`);
    }
  }

  getApiKeyStatus(): OpenApiKeyInfo[] {
    return this.apiKeys.map(key => ({
      ...key,
      remaining: this.DAILY_LIMIT - key.dailyUsage,
    }));
  }

  getTotalRemainingCalls(): number {
    return this.apiKeys.reduce((sum, key) => sum + (key.isActive ? (this.DAILY_LIMIT - key.dailyUsage) : 0), 0);
  }
}
