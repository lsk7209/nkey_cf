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
  private clientId: string
  private clientSecret: string

  constructor() {
    this.clientId = process.env.NAVER_CLIENT_ID || ''
    this.clientSecret = process.env.NAVER_CLIENT_SECRET || ''
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('네이버 OpenAPI 클라이언트 ID 또는 Secret이 설정되지 않았습니다.')
    }
  }

  private async searchDocuments(
    query: string, 
    service: 'blog' | 'news' | 'webkr' | 'cafearticle',
    display: number = 1
  ): Promise<number> {
    if (!this.clientId || !this.clientSecret) {
      console.warn('네이버 OpenAPI 인증 정보가 없습니다.')
      return 0
    }

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
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 429) {
        console.warn('네이버 API 호출 한도 초과')
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

  // 배치 처리용 (여러 키워드의 문서수를 한 번에 조회)
  async getBatchDocumentCounts(keywords: string[]): Promise<Map<string, DocumentCounts>> {
    const results = new Map<string, DocumentCounts>()
    
    for (const keyword of keywords) {
      try {
        const counts = await this.getDocumentCounts(keyword)
        results.set(keyword, counts)
        
        // API 한도 고려한 대기
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`키워드 "${keyword}" 문서수 조회 실패:`, error)
        results.set(keyword, { blog: 0, news: 0, webkr: 0, cafe: 0 })
      }
    }

    return results
  }
}
