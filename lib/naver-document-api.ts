import { OpenApiKeyManager } from './openapi-key-manager';

interface NaverDocumentResponse {
  lastBuildDate: string
  total: number
  start: number
  display: number
  items: Array<{
    title: string
    link: string
    description: string
    bloggername?: string
    bloggerlink?: string
    postdate?: string
    thumbnail?: string
  }>
}

interface DocumentCounts {
  blog: number
  news: number
  webkr: number
  cafe: number
}

export class NaverDocumentAPI {
  private baseUrl = 'https://openapi.naver.com'
  private openApiKeyManager: OpenApiKeyManager

  constructor() {
    this.openApiKeyManager = new OpenApiKeyManager();
  }

  private async searchDocuments(
    query: string, 
    service: 'blog' | 'news' | 'webkr' | 'cafearticle',
    display: number = 1
  ): Promise<number> {
    // 사용 가능한 API 키 가져오기
    const apiKeyInfo = this.openApiKeyManager.getAvailableApiKey();
    if (!apiKeyInfo) {
      console.warn('사용 가능한 OpenAPI 키가 없습니다.');
      return 0;
    }

    try {
      const endpoint = `/v1/search/${service}.json`
      const params = new URLSearchParams({
        query: query,
        display: display.toString(),
        start: '1'
      })

      const url = `${this.baseUrl}${endpoint}?${params.toString()}`
      
      // 재시도 로직이 포함된 fetch 함수
      const fetchWithRetry = async (retryCount: number = 0): Promise<any> => {
        const maxRetries = 3
        const baseDelay = 1000 // 1초
        
        try {
          // AbortController로 타임아웃 설정
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30초 타임아웃
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-Naver-Client-Id': apiKeyInfo.clientId,
              'X-Naver-Client-Secret': apiKeyInfo.clientSecret,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          // API 사용량 증가
          this.openApiKeyManager.incrementUsage(apiKeyInfo.id);

          if (response.status === 429) {
            // 해당 API 키 비활성화 및 자동 전환
            this.openApiKeyManager.deactivateApiKey(apiKeyInfo.id, '429 에러');
            console.warn(`OpenAPI 키 ${apiKeyInfo.name} 호출 한도 초과`);
            
            // 다른 사용 가능한 키로 재시도
            const nextKey = this.openApiKeyManager.getSmartApiKey();
            if (nextKey) {
              console.log(`🔄 다른 키로 자동 전환: ${nextKey.name}`);
              return await this.searchDocumentsWithKey(query, service, nextKey);
            }
            
            return 0;
          }

          if (!response.ok) {
            console.error(`네이버 ${service} API 호출 실패:`, response.status, response.statusText)
            return 0
          }

          const data: NaverDocumentResponse = await response.json()
          return data.total || 0
          
        } catch (error: any) {
          // 네트워크 에러나 타임아웃 에러인 경우 재시도
          if (retryCount < maxRetries && (
            error.name === 'AbortError' || 
            error.code === 'ETIMEDOUT' || 
            error.code === 'ECONNRESET' ||
            error.message.includes('fetch failed') ||
            error.message.includes('network') ||
            error.message.includes('socket')
          )) {
            const delay = baseDelay * Math.pow(2, retryCount) // 지수 백오프
            console.warn(`OpenAPI 호출 실패 (시도 ${retryCount + 1}/${maxRetries + 1}): ${error.message}, ${delay}ms 후 재시도`)
            
            await new Promise(resolve => setTimeout(resolve, delay))
            return fetchWithRetry(retryCount + 1)
          }
          
          // 최대 재시도 횟수 초과 또는 재시도 불가능한 에러
          console.error(`OpenAPI 호출 최종 실패: ${error.message}`)
          return 0
        }
      }

      return await fetchWithRetry()

    } catch (error) {
      console.error(`네이버 ${service} API 오류:`, error)
      return 0
    }
  }

  async getDocumentCounts(keyword: string): Promise<DocumentCounts> {
    if (!keyword.trim()) {
      return { blog: 0, news: 0, webkr: 0, cafe: 0 }
    }

    try {
      // API 호출 한도를 고려하여 순차적으로 호출
      const [blog, news, webkr, cafe] = await Promise.all([
        this.searchDocuments(keyword, 'blog'),
        this.searchDocuments(keyword, 'news'),
        this.searchDocuments(keyword, 'webkr'),
        this.searchDocuments(keyword, 'cafearticle')
      ])

      // 각 API 호출 사이에 짧은 대기 (API 한도 고려)
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        blog,
        news,
        webkr,
        cafe
      }

    } catch (error) {
      console.error('문서수 조회 오류:', error)
      return { blog: 0, news: 0, webkr: 0, cafe: 0 }
    }
  }

  // 고성능 배치 처리용 (여러 키워드의 문서수를 병렬로 조회)
  async getBatchDocumentCounts(keywords: string[], maxConcurrency: number = 5): Promise<Map<string, DocumentCounts>> {
    const results = new Map<string, DocumentCounts>()
    const availableKeys = this.openApiKeyManager.getAvailableApiKeys(maxConcurrency)
    
    if (availableKeys.length === 0) {
      console.warn('사용 가능한 OpenAPI 키가 없어 배치 처리를 중단합니다.')
      return results
    }

    console.log(`${keywords.length}개 키워드의 문서수를 ${availableKeys.length}개 OpenAPI 키로 병렬 처리합니다.`)

    // 키워드를 청크로 나누기
    const chunkSize = Math.ceil(keywords.length / availableKeys.length)
    const chunks = []
    for (let i = 0; i < keywords.length; i += chunkSize) {
      chunks.push(keywords.slice(i, i + chunkSize))
    }

    // 각 API 키로 청크를 병렬 처리 (스마트 키 전환 포함)
    const chunkPromises = chunks.map(async (chunk, index) => {
      let currentApiKey = availableKeys[index % availableKeys.length]
      const chunkResults = new Map<string, DocumentCounts>()

      for (const keyword of chunk) {
        try {
          // 현재 키가 비활성화된 경우 다른 키로 전환
          if (!currentApiKey.isActive) {
            const nextKey = this.openApiKeyManager.getSmartApiKey()
            if (nextKey) {
              currentApiKey = nextKey
              console.log(`🔄 청크 ${index + 1}: 키 전환 → ${currentApiKey.name}`)
            } else {
              console.warn(`⚠️ 청크 ${index + 1}: 사용 가능한 키가 없어 기본값 설정`)
              chunkResults.set(keyword, { blog: 0, news: 0, webkr: 0, cafe: 0 })
              continue
            }
          }

          const counts = await this.getDocumentCountsWithKey(keyword, currentApiKey)
          chunkResults.set(keyword, counts)
          
          // API 호출 간격 조절 (키 사용량에 따라 조절)
          const delay = currentApiKey.dailyUsage > 20000 ? 200 : 100
          await new Promise(resolve => setTimeout(resolve, delay))
        } catch (error) {
          console.error(`키워드 "${keyword}" 문서수 조회 실패:`, error)
          chunkResults.set(keyword, { blog: 0, news: 0, webkr: 0, cafe: 0 })
        }
      }

      return chunkResults
    })

    // 모든 청크 결과를 기다리고 합치기
    const allChunkResults = await Promise.all(chunkPromises)
    allChunkResults.forEach(chunkResult => {
      chunkResult.forEach((counts, keyword) => {
        results.set(keyword, counts)
      })
    })

    console.log(`문서수 배치 처리 완료: ${results.size}개 키워드 처리됨`)
    return results
  }

  // 특정 API 키로 문서수 조회
  private async getDocumentCountsWithKey(keyword: string, apiKeyInfo: any): Promise<DocumentCounts> {
    if (!keyword.trim()) {
      return { blog: 0, news: 0, webkr: 0, cafe: 0 }
    }

    try {
      // 4개 서비스를 병렬로 호출
      const [blog, news, webkr, cafe] = await Promise.all([
        this.searchDocumentsWithKey(keyword, 'blog', apiKeyInfo),
        this.searchDocumentsWithKey(keyword, 'news', apiKeyInfo),
        this.searchDocumentsWithKey(keyword, 'webkr', apiKeyInfo),
        this.searchDocumentsWithKey(keyword, 'cafearticle', apiKeyInfo)
      ])

      return { blog, news, webkr, cafe }
    } catch (error) {
      console.error('문서수 조회 오류:', error)
      return { blog: 0, news: 0, webkr: 0, cafe: 0 }
    }
  }

  // 특정 API 키로 문서 검색
  private async searchDocumentsWithKey(
    query: string, 
    service: 'blog' | 'news' | 'webkr' | 'cafearticle',
    apiKeyInfo: any,
    display: number = 1
  ): Promise<number> {
    try {
      const endpoint = `/v1/search/${service}.json`
      const params = new URLSearchParams({
        query: query,
        display: display.toString(),
        start: '1'
      })

      const url = `${this.baseUrl}${endpoint}?${params.toString()}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Naver-Client-Id': apiKeyInfo.clientId,
          'X-Naver-Client-Secret': apiKeyInfo.clientSecret,
          'Content-Type': 'application/json'
        }
      })

      // API 사용량 증가
      this.openApiKeyManager.incrementUsage(apiKeyInfo.id)

      if (response.status === 429) {
        this.openApiKeyManager.deactivateApiKey(apiKeyInfo.id)
        console.warn(`OpenAPI 키 ${apiKeyInfo.name} 호출 한도 초과`)
        return 0
      }

      if (!response.ok) {
        console.error(`네이버 ${service} API 호출 실패:`, response.status, response.statusText)
        return 0
      }

      const data: NaverDocumentResponse = await response.json()
      return data.total || 0

    } catch (error) {
      console.error(`네이버 ${service} API 오류:`, error)
      return 0
    }
  }

  // OpenAPI 키 상태 조회
  getOpenApiKeyStatus() {
    return this.openApiKeyManager.getApiKeyStatus();
  }

  // 총 사용 가능한 OpenAPI 호출 수
  getTotalRemainingOpenApiCalls() {
    return this.openApiKeyManager.getTotalRemainingCalls();
  }
}
