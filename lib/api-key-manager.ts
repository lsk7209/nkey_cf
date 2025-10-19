interface ApiKeyInfo {
  id: string
  name: string
  apiKey: string
  secret: string
  customerId: string
  dailyUsage: number
  lastUsed: Date
  isActive: boolean
}

export class ApiKeyManager {
  private apiKeys: ApiKeyInfo[] = []
  private currentIndex = 0
  private readonly DAILY_LIMIT = 25000 // 네이버 API 일일 제한

  constructor() {
    this.initializeApiKeys()
  }

  private initializeApiKeys() {
    // 환경변수에서 API 키들을 로드
    const keys = [
      {
        id: 'key1',
        name: '검색광고API키1',
        apiKey: process.env.SEARCHAD_API_KEY || '',
        secret: process.env.SEARCHAD_SECRET || '',
        customerId: process.env.SEARCHAD_CUSTOMER_ID || ''
      },
      {
        id: 'key2',
        name: '검색광고API키2',
        apiKey: process.env.SEARCHAD_API_KEY_2 || '',
        secret: process.env.SEARCHAD_SECRET_2 || '',
        customerId: process.env.SEARCHAD_CUSTOMER_ID_2 || ''
      },
      {
        id: 'key3',
        name: '검색광고API키3',
        apiKey: process.env.SEARCHAD_API_KEY_3 || '',
        secret: process.env.SEARCHAD_SECRET_3 || '',
        customerId: process.env.SEARCHAD_CUSTOMER_ID_3 || ''
      },
      {
        id: 'key4',
        name: '검색광고API키4',
        apiKey: process.env.SEARCHAD_API_KEY_4 || '',
        secret: process.env.SEARCHAD_SECRET_4 || '',
        customerId: process.env.SEARCHAD_CUSTOMER_ID_4 || ''
      },
      {
        id: 'key5',
        name: '검색광고API키5',
        apiKey: process.env.SEARCHAD_API_KEY_5 || '',
        secret: process.env.SEARCHAD_SECRET_5 || '',
        customerId: process.env.SEARCHAD_CUSTOMER_ID_5 || ''
      }
    ]

    // 유효한 API 키만 추가
    this.apiKeys = keys
      .filter(key => key.apiKey && key.secret && key.customerId)
      .map(key => ({
        ...key,
        dailyUsage: 0,
        lastUsed: new Date(),
        isActive: true
      }))

    console.log(`API 키 매니저 초기화: ${this.apiKeys.length}개 키 활성화`)
  }

  // 사용 가능한 API 키 가져오기 (로테이션)
  getAvailableApiKey(): ApiKeyInfo | null {
    if (this.apiKeys.length === 0) {
      return null
    }

    // 사용량이 적은 키부터 우선 선택
    const sortedKeys = this.apiKeys
      .filter(key => key.isActive && key.dailyUsage < this.DAILY_LIMIT)
      .sort((a, b) => a.dailyUsage - b.dailyUsage)

    if (sortedKeys.length === 0) {
      console.warn('사용 가능한 API 키가 없습니다.')
      return null
    }

    return sortedKeys[0]
  }

  // 여러 API 키를 동시에 가져오기 (병렬 처리용)
  getAvailableApiKeys(count: number): ApiKeyInfo[] {
    const availableKeys = this.apiKeys.filter(key => key.isActive && key.dailyUsage < this.DAILY_LIMIT)

    if (availableKeys.length === 0) {
      return []
    }

    // 사용량과 마지막 사용 시간을 고려하여 정렬
    const sortedKeys = availableKeys.sort((a, b) => {
      if (a.dailyUsage !== b.dailyUsage) {
        return a.dailyUsage - b.dailyUsage
      }
      return a.lastUsed.getTime() - b.lastUsed.getTime()
    })

    // 요청한 개수만큼 반환 (최대 사용 가능한 키 수)
    return sortedKeys.slice(0, Math.min(count, availableKeys.length))
  }

  // API 키 사용량 증가
  incrementUsage(apiKeyId: string, usage: number = 1) {
    const key = this.apiKeys.find(k => k.id === apiKeyId)
    if (key) {
      key.dailyUsage += usage
      key.lastUsed = new Date()
    }
  }

  // API 키 비활성화 (한도 초과 시)
  deactivateApiKey(apiKeyId: string) {
    const key = this.apiKeys.find(k => k.id === apiKeyId)
    if (key) {
      key.isActive = false
      console.warn(`API 키 ${key.name} 비활성화 (한도 초과)`)
    }
  }

  // 모든 API 키 상태 조회
  getApiKeyStatus() {
    return this.apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      dailyUsage: key.dailyUsage,
      remaining: this.DAILY_LIMIT - key.dailyUsage,
      isActive: key.isActive,
      lastUsed: key.lastUsed
    }))
  }

  // 사용 가능한 총 API 호출 수
  getTotalRemainingCalls(): number {
    return this.apiKeys
      .filter(key => key.isActive)
      .reduce((total, key) => total + (this.DAILY_LIMIT - key.dailyUsage), 0)
  }

  // 다음 사용 가능한 키로 로테이션
  rotateToNextKey(): ApiKeyInfo | null {
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length
    return this.getAvailableApiKey()
  }
}
