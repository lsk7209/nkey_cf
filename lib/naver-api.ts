// Naver SearchAd API 관련 유틸리티
import { getAvailableSearchAdKey, getAvailableOpenApiKey, handleApiKeyError, handleApiKeySuccess } from './api-key-manager'

export interface SearchAdResponse {
  keywordList: Array<{
    relKeyword: string
    monthlyPcQcCnt: number
    monthlyMobileQcCnt: number
    plAvgCpc: number
    moAvgCpc: number
    competition: string
  }>
}

export interface OpenApiResponse {
  total: number
  items: Array<{
    title: string
    link: string
    description: string
  }>
}

// HMAC-SHA256 시그니처 생성
export async function generateSignature(
  secret: string,
  timestamp: string,
  method: string,
  uri: string
): Promise<string> {
  const message = `${timestamp}.${method}.${uri}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

// Naver SearchAd API 호출 (다중 키 지원)
export async function callSearchAdAPI(keywords: string[]): Promise<SearchAdResponse> {
  const apiKey = getAvailableSearchAdKey()
  
  if (!apiKey) {
    throw new Error('사용 가능한 SearchAd API 키가 없습니다.')
  }

  const timestamp = Date.now().toString()
  const method = 'POST'
  const uri = '/keywordstool'
  
  try {
    const signature = await generateSignature(apiKey.secretKey, timestamp, method, uri)
    
    const response = await fetch('https://api.naver.com/keywordstool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-API-KEY': apiKey.accessLicense,
        'X-Customer': apiKey.customerId,
        'X-Signature': signature,
      },
      body: JSON.stringify({
        hintKeywords: keywords,
        showDetail: 1
      })
    })

    if (!response.ok) {
      if (response.status === 429) {
        handleApiKeyError(apiKey.id, new Error('Rate limit exceeded'))
        throw new Error('API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.')
      }
      handleApiKeyError(apiKey.id, new Error(`HTTP ${response.status}`))
      throw new Error(`SearchAd API 오류: ${response.status}`)
    }

    handleApiKeySuccess(apiKey.id)
    return response.json()
  } catch (error) {
    handleApiKeyError(apiKey.id, error)
    throw error
  }
}

// Naver OpenAPI 호출 (다중 키 지원, 병렬)
export async function callOpenAPI(keyword: string): Promise<{
  blog: number
  cafe: number
  news: number
  web: number
}> {
  const apiKey = getAvailableOpenApiKey()
  
  if (!apiKey) {
    throw new Error('사용 가능한 OpenAPI 키가 없습니다.')
  }

  const baseUrl = 'https://openapi.naver.com/v1/search'
  
  const headers = {
    'X-Naver-Client-Id': apiKey.clientId,
    'X-Naver-Client-Secret': apiKey.clientSecret,
  }

  try {
    const [blogRes, cafeRes, newsRes, webRes] = await Promise.all([
      fetch(`${baseUrl}/blog.json?query=${encodeURIComponent(keyword)}&display=100`, { headers }),
      fetch(`${baseUrl}/cafearticle.json?query=${encodeURIComponent(keyword)}&display=100`, { headers }),
      fetch(`${baseUrl}/news.json?query=${encodeURIComponent(keyword)}&display=100`, { headers }),
      fetch(`${baseUrl}/webkr.json?query=${encodeURIComponent(keyword)}&display=100`, { headers })
    ])

    // 에러 체크
    if (!blogRes.ok || !cafeRes.ok || !newsRes.ok || !webRes.ok) {
      if (blogRes.status === 429 || cafeRes.status === 429 || newsRes.status === 429 || webRes.status === 429) {
        handleApiKeyError(apiKey.id, new Error('Rate limit exceeded'))
        throw new Error('OpenAPI 호출 제한에 도달했습니다.')
      }
      handleApiKeyError(apiKey.id, new Error('HTTP error'))
      throw new Error('OpenAPI 호출 중 오류가 발생했습니다.')
    }

    const [blogData, cafeData, newsData, webData] = await Promise.all([
      blogRes.json(),
      cafeRes.json(),
      newsRes.json(),
      webRes.json()
    ])

    handleApiKeySuccess(apiKey.id)
    
    return {
      blog: blogData.total || 0,
      cafe: cafeData.total || 0,
      news: newsData.total || 0,
      web: webData.total || 0
    }
  } catch (error) {
    handleApiKeyError(apiKey.id, error)
    throw error
  }
}

// 데이터 정규화
export function normalizeSearchAdData(
  searchAdData: SearchAdResponse,
  openApiData: { blog: number; cafe: number; news: number; web: number }
) {
  if (!searchAdData?.keywordList) return []

  return searchAdData.keywordList.map((item) => {
    const pcSearch = Math.max(item.monthlyPcQcCnt || 0, 10)
    const mobileSearch = Math.max(item.monthlyMobileQcCnt || 0, 10)
    const totalDocs = openApiData.blog + openApiData.cafe + openApiData.news + openApiData.web
    
    // 잠재지수 계산
    const potentialScore = ((pcSearch + mobileSearch) / Math.max(totalDocs, 1)) * 100

    return {
      rel_keyword: item.relKeyword || '',
      pc_search: pcSearch,
      mobile_search: mobileSearch,
      ctr_pc: parseFloat(item.plAvgCpc?.toString() || '0'),
      ctr_mo: parseFloat(item.moAvgCpc?.toString() || '0'),
      ad_count: parseInt(item.competition || '0'),
      comp_idx: item.competition === 'HIGH' ? '높음' : 
                item.competition === 'MEDIUM' ? '중간' : '낮음',
      blog_count: openApiData.blog,
      cafe_count: openApiData.cafe,
      news_count: openApiData.news,
      web_count: openApiData.web,
      total_docs: totalDocs,
      potential_score: potentialScore,
      source: 'fresh' as const
    }
  })
}
