import { NextRequest, NextResponse } from 'next/server'

interface KeywordRecord {
  id: number
  date_bucket: string
  keyword: string
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
  fetched_at: string
}

// CSV 헤더
const CSV_HEADERS = [
  '수집일',
  '키워드',
  '관련키워드',
  'PC검색량',
  '모바일검색량',
  'PC_CTR',
  '모바일_CTR',
  '광고수',
  '경쟁도',
  '블로그수',
  '카페수',
  '뉴스수',
  '웹수',
  '총문서수',
  '잠재지수',
  '수집시간'
]

// 레코드를 CSV 행으로 변환
function recordToCSVRow(record: KeywordRecord): string {
  return [
    record.date_bucket,
    record.keyword,
    record.rel_keyword,
    record.pc_search,
    record.mobile_search,
    record.ctr_pc,
    record.ctr_mo,
    record.ad_count,
    record.comp_idx,
    record.blog_count,
    record.cafe_count,
    record.news_count,
    record.web_count,
    record.total_docs,
    record.potential_score,
    record.fetched_at
  ].map(field => {
    // CSV 이스케이프 처리
    const str = String(field || '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }).join(',')
}

// D1 데이터베이스에서 데이터 조회 (실제 구현에서는 Cloudflare D1 사용)
async function fetchAllDataFromDatabase(params: {
  query?: string
  dateFilter?: string
  compFilter?: string
  sortBy: string
  sortOrder: string
}): Promise<KeywordRecord[]> {
  // TODO: 실제 D1 데이터베이스 연결
  // const db = getD1Database()
  
  // 임시 데이터 (실제 구현에서는 D1에서 조회)
  const mockData: KeywordRecord[] = [
    {
      id: 1,
      date_bucket: '2024-01-15',
      keyword: '풀빌라',
      rel_keyword: '강원도풀빌라',
      pc_search: 1890,
      mobile_search: 9280,
      ctr_pc: 2.86,
      ctr_mo: 4.45,
      ad_count: 15,
      comp_idx: '높음',
      blog_count: 43120,
      cafe_count: 5120,
      news_count: 830,
      web_count: 9410,
      total_docs: 58480,
      potential_score: 19.1,
      fetched_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      date_bucket: '2024-01-15',
      keyword: '풀빌라',
      rel_keyword: '제주도풀빌라',
      pc_search: 1200,
      mobile_search: 5600,
      ctr_pc: 3.2,
      ctr_mo: 4.8,
      ad_count: 8,
      comp_idx: '중간',
      blog_count: 28000,
      cafe_count: 3200,
      news_count: 450,
      web_count: 5200,
      total_docs: 36850,
      potential_score: 18.5,
      fetched_at: '2024-01-15T10:30:00Z'
    }
  ]

  // 필터링 로직 (data/route.ts와 동일)
  let filteredData = mockData

  if (params.query) {
    const queryLower = params.query.toLowerCase()
    filteredData = filteredData.filter(item => 
      item.keyword.toLowerCase().includes(queryLower) ||
      item.rel_keyword.toLowerCase().includes(queryLower)
    )
  }

  if (params.dateFilter && params.dateFilter !== 'all') {
    const today = new Date()
    let cutoffDate: Date
    
    switch (params.dateFilter) {
      case 'today':
        cutoffDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        break
      case '7days':
        cutoffDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30days':
        cutoffDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoffDate = new Date(0)
    }
    
    filteredData = filteredData.filter(item => 
      new Date(item.fetched_at) >= cutoffDate
    )
  }

  if (params.compFilter && params.compFilter !== 'all') {
    const compMap: { [key: string]: string } = {
      'high': '높음',
      'medium': '중간',
      'low': '낮음'
    }
    filteredData = filteredData.filter(item => 
      item.comp_idx === compMap[params.compFilter!]
    )
  }

  // 정렬
  filteredData.sort((a, b) => {
    const aValue = (a as any)[params.sortBy]
    const bValue = (b as any)[params.sortBy]
    
    if (params.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  return filteredData
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('query') || undefined
    const dateFilter = searchParams.get('dateFilter') || undefined
    const compFilter = searchParams.get('compFilter') || undefined
    const sortBy = searchParams.get('sortBy') || 'fetched_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const data = await fetchAllDataFromDatabase({
      query,
      dateFilter,
      compFilter,
      sortBy,
      sortOrder
    })

    // CSV 생성
    const csvRows = [
      CSV_HEADERS.join(','),
      ...data.map(recordToCSVRow)
    ]
    
    const csvContent = csvRows.join('\n')
    
    // UTF-8 BOM 추가 (Excel 호환성)
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="keywords_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('CSV Export Error:', error)
    return NextResponse.json(
      { message: 'CSV 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
