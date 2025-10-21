import { NextRequest, NextResponse } from 'next/server'

interface KeywordData {
  rel_keyword: string
  pc_search: number
  mobile_search: number
  ctr_pc: number
  ctr_mo: number
  ad_count: number
  comp_idx: string
  blog_count: number
  cafe_count: number
  news_count: number
  web_count: number
  total_docs: number
  potential_score: number
  source: 'fresh' | 'cache' | 'cooldown'
}

interface SearchResult {
  keyword: string
  related: KeywordData[]
}

// Naver SearchAd API 호출
async function fetchSearchAdData(keyword: string): Promise<any> {
  const timestamp = Date.now().toString()
  const method = 'POST'
  const uri = '/keywordstool'
  
  // 시그니처 생성 (실제 구현에서는 HMAC-SHA256 사용)
  const signature = btoa(`${timestamp}.${method}.${uri}`)
  
  const response = await fetch('https://api.naver.com/keywordstool', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-API-KEY': process.env.SEARCHAD_ACCESS_LICENSE!,
      'X-Customer': process.env.SEARCHAD_CUSTOMER_ID!,
      'X-Signature': signature,
    },
    body: JSON.stringify({
      hintKeywords: [keyword],
      showDetail: 1
    })
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.')
    }
    throw new Error(`SearchAd API 오류: ${response.status}`)
  }

  return response.json()
}

// Naver OpenAPI 호출 (병렬 처리)
async function fetchOpenApiData(keyword: string): Promise<any> {
  const baseUrl = 'https://openapi.naver.com/v1/search'
  
  const [blogRes, cafeRes, newsRes, webRes] = await Promise.all([
    fetch(`${baseUrl}/blog.json?query=${encodeURIComponent(keyword)}&display=100`, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      }
    }),
    fetch(`${baseUrl}/cafearticle.json?query=${encodeURIComponent(keyword)}&display=100`, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      }
    }),
    fetch(`${baseUrl}/news.json?query=${encodeURIComponent(keyword)}&display=100`, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      }
    }),
    fetch(`${baseUrl}/webkr.json?query=${encodeURIComponent(keyword)}&display=100`, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      }
    })
  ])

  const [blogData, cafeData, newsData, webData] = await Promise.all([
    blogRes.json(),
    cafeRes.json(),
    newsRes.json(),
    webRes.json()
  ])

  return {
    blog: blogData.total || 0,
    cafe: cafeData.total || 0,
    news: newsData.total || 0,
    web: webData.total || 0
  }
}

// 데이터 정규화 및 잠재지수 계산
function normalizeData(searchAdData: any, openApiData: any): KeywordData[] {
  if (!searchAdData?.keywordList) return []

  return searchAdData.keywordList.map((item: any) => {
    const pcSearch = Math.max(item.monthlyPcQcCnt || 0, 10)
    const mobileSearch = Math.max(item.monthlyMobileQcCnt || 0, 10)
    const totalDocs = openApiData.blog + openApiData.cafe + openApiData.news + openApiData.web
    
    // 잠재지수 계산: (PC검색량 + 모바일검색량) / max(총문서수, 1) * 100
    const potentialScore = ((pcSearch + mobileSearch) / Math.max(totalDocs, 1)) * 100

    return {
      rel_keyword: item.relKeyword || '',
      pc_search: pcSearch,
      mobile_search: mobileSearch,
      ctr_pc: parseFloat(item.plAvgCpc || '0'),
      ctr_mo: parseFloat(item.moAvgCpc || '0'),
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

// D1 데이터베이스에 저장
async function saveToDatabase(keyword: string, data: KeywordData[]) {
  // 실제 구현에서는 Cloudflare D1 사용
  // 여기서는 로그만 출력
  console.log(`Saving data for keyword: ${keyword}`, data.length, 'items')
  
  // TODO: D1 데이터베이스 연결 및 UPSERT 구현
  // const db = getD1Database()
  // for (const item of data) {
  //   await db.prepare(`
  //     INSERT OR REPLACE INTO keywords 
  //     (date_bucket, keyword, rel_keyword, pc_search, mobile_search, ...)
  //     VALUES (?, ?, ?, ?, ?, ...)
  //   `).bind(
  //     new Date().toISOString().split('T')[0], // date_bucket
  //     keyword,
  //     item.rel_keyword,
  //     item.pc_search,
  //     item.mobile_search,
  //     // ... 기타 필드들
  //   ).run()
  // }
}

export async function POST(request: NextRequest) {
  try {
    const { hintKeywords } = await request.json()
    
    if (!hintKeywords) {
      return NextResponse.json(
        { message: '키워드가 필요합니다.' },
        { status: 400 }
      )
    }

    const keywordList = hintKeywords.split(',').map((k: string) => k.trim()).filter((k: string) => k)
    
    if (keywordList.length === 0) {
      return NextResponse.json(
        { message: '유효한 키워드가 없습니다.' },
        { status: 400 }
      )
    }

    if (keywordList.length > 5) {
      return NextResponse.json(
        { message: '최대 5개의 키워드만 허용됩니다.' },
        { status: 400 }
      )
    }

    const results: SearchResult[] = []

    // 각 키워드에 대해 병렬 처리
    await Promise.all(keywordList.map(async (keyword: string) => {
      try {
        // SearchAd API와 OpenAPI 병렬 호출
        const [searchAdData, openApiData] = await Promise.all([
          fetchSearchAdData(keyword),
          fetchOpenApiData(keyword)
        ])

        // 데이터 정규화
        const normalizedData = normalizeData(searchAdData, openApiData)
        
        // 데이터베이스에 저장
        await saveToDatabase(keyword, normalizedData)

        results.push({
          keyword,
          related: normalizedData
        })
      } catch (error) {
        console.error(`Error processing keyword ${keyword}:`, error)
        // 에러가 발생해도 다른 키워드는 계속 처리
        results.push({
          keyword,
          related: []
        })
      }
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
