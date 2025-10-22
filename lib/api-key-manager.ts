// API 키 관리 시스템

export interface ApiKey {
  id: string
  accessLicense: string
  secretKey: string
  customerId: string
  isActive: boolean
  lastUsed?: Date
  errorCount: number
  cooldownUntil?: Date
}

export interface OpenApiKey {
  id: string
  clientId: string
  clientSecret: string
  isActive: boolean
  lastUsed?: Date
  errorCount: number
  cooldownUntil?: Date
}

// SearchAd API 키 목록
export function getSearchAdKeys(): ApiKey[] {
  const keys: ApiKey[] = []
  
  for (let i = 1; i <= 10; i++) {
    const accessLicense = process.env[`SEARCHAD_ACCESS_LICENSE_${i}`]
    const secretKey = process.env[`SEARCHAD_SECRET_KEY_${i}`]
    const customerId = process.env[`SEARCHAD_CUSTOMER_ID_${i}`]
    
    if (accessLicense && secretKey && customerId) {
      keys.push({
        id: `searchad_${i}`,
        accessLicense,
        secretKey,
        customerId,
        isActive: true,
        errorCount: 0
      })
    }
  }
  
  return keys
}

// OpenAPI 키 목록
export function getOpenApiKeys(): OpenApiKey[] {
  const keys: OpenApiKey[] = []
  
  for (let i = 1; i <= 10; i++) {
    const clientId = process.env[`NAVER_CLIENT_ID_${i}`]
    const clientSecret = process.env[`NAVER_CLIENT_SECRET_${i}`]
    
    if (clientId && clientSecret) {
      keys.push({
        id: `openapi_${i}`,
        clientId,
        clientSecret,
        isActive: true,
        errorCount: 0
      })
    }
  }
  
  return keys
}

// 사용 가능한 SearchAd 키 선택 (로테이션)
export function getAvailableSearchAdKey(): ApiKey | null {
  const keys = getSearchAdKeys()
  const now = new Date()
  
  // 쿨다운이 끝난 키들 중에서 선택
  const availableKeys = keys.filter(key => 
    key.isActive && 
    (!key.cooldownUntil || key.cooldownUntil <= now)
  )
  
  if (availableKeys.length === 0) {
    return null
  }
  
  // 에러 수가 적은 순으로 정렬
  availableKeys.sort((a, b) => a.errorCount - b.errorCount)
  
  return availableKeys[0]
}

// 사용 가능한 OpenAPI 키 선택 (로테이션)
export function getAvailableOpenApiKey(): OpenApiKey | null {
  const keys = getOpenApiKeys()
  const now = new Date()
  
  // 쿨다운이 끝난 키들 중에서 선택
  const availableKeys = keys.filter(key => 
    key.isActive && 
    (!key.cooldownUntil || key.cooldownUntil <= now)
  )
  
  if (availableKeys.length === 0) {
    return null
  }
  
  // 에러 수가 적은 순으로 정렬
  availableKeys.sort((a, b) => a.errorCount - b.errorCount)
  
  return availableKeys[0]
}

// 키 에러 처리
export function handleApiKeyError(keyId: string, error: any) {
  console.error(`API Key Error for ${keyId}:`, error)
  
  // 여기서는 로그만 남기고, 실제 구현에서는 KV에 상태 저장
  // KV에 키 상태 업데이트 (에러 카운트 증가, 쿨다운 설정 등)
}

// 키 성공 처리
export function handleApiKeySuccess(keyId: string) {
  console.log(`API Key Success for ${keyId}`)
  
  // 여기서는 로그만 남기고, 실제 구현에서는 KV에 상태 저장
  // KV에서 에러 카운트 리셋
}
