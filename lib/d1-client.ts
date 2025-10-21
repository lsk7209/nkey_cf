// Cloudflare D1 데이터베이스 클라이언트

export interface KeywordRecord {
  id?: number
  date_bucket: string
  keyword: string
  rel_keyword: string
  pc_search: number
  mobile_search: number
  click_pc: number
  click_mo: number
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
  raw_json?: string
  fetched_at: string
}

// D1 데이터베이스 연결 (실제 구현에서는 Cloudflare 환경에서 사용)
export function getD1Database() {
  // Cloudflare Workers 환경에서 사용
  // return env.DB as D1Database
  throw new Error('D1 데이터베이스는 Cloudflare 환경에서만 사용 가능합니다.')
}

// 키워드 데이터 저장 (UPSERT)
export async function saveKeywordData(
  db: any, // D1Database 타입
  data: Omit<KeywordRecord, 'id'>[]
): Promise<void> {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO keywords (
      date_bucket, keyword, rel_keyword, pc_search, mobile_search,
      click_pc, click_mo, ctr_pc, ctr_mo, ad_count, comp_idx,
      blog_count, cafe_count, news_count, web_count, total_docs,
      potential_score, raw_json, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const item of data) {
    await stmt.bind(
      item.date_bucket,
      item.keyword,
      item.rel_keyword,
      item.pc_search,
      item.mobile_search,
      item.click_pc,
      item.click_mo,
      item.ctr_pc,
      item.ctr_mo,
      item.ad_count,
      item.comp_idx,
      item.blog_count,
      item.cafe_count,
      item.news_count,
      item.web_count,
      item.total_docs,
      item.potential_score,
      item.raw_json || null,
      item.fetched_at
    ).run()
  }
}

// 키워드 데이터 조회
export async function getKeywordData(
  db: any, // D1Database 타입
  params: {
    page: number
    pageSize: number
    query?: string
    dateFilter?: string
    compFilter?: string
    sortBy: string
    sortOrder: string
  }
): Promise<{
  total: number
  items: KeywordRecord[]
  page: number
  totalPages: number
}> {
  // WHERE 조건 구성
  const conditions: string[] = []
  const bindings: any[] = []

  if (params.query) {
    conditions.push('(keyword LIKE ? OR rel_keyword LIKE ?)')
    bindings.push(`%${params.query}%`, `%${params.query}%`)
  }

  if (params.dateFilter && params.dateFilter !== 'all') {
    const today = new Date()
    let cutoffDate: string
    
    switch (params.dateFilter) {
      case 'today':
        cutoffDate = today.toISOString().split('T')[0]
        break
      case '7days':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        cutoffDate = weekAgo.toISOString().split('T')[0]
        break
      case '30days':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        cutoffDate = monthAgo.toISOString().split('T')[0]
        break
      default:
        cutoffDate = '1900-01-01'
    }
    
    conditions.push('fetched_at >= ?')
    bindings.push(cutoffDate)
  }

  if (params.compFilter && params.compFilter !== 'all') {
    const compMap: { [key: string]: string } = {
      'high': '높음',
      'medium': '중간',
      'low': '낮음'
    }
    
    conditions.push('comp_idx = ?')
    bindings.push(compMap[params.compFilter])
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 총 개수 조회
  const countResult = await db.prepare(`
    SELECT COUNT(*) as total FROM keywords ${whereClause}
  `).bind(...bindings).first()

  const total = countResult?.total || 0
  const totalPages = Math.ceil(total / params.pageSize)

  // 데이터 조회
  const offset = (params.page - 1) * params.pageSize
  const orderBy = `ORDER BY ${params.sortBy} ${params.sortOrder.toUpperCase()}`
  const limit = `LIMIT ${params.pageSize} OFFSET ${offset}`

  const result = await db.prepare(`
    SELECT * FROM keywords ${whereClause} ${orderBy} ${limit}
  `).bind(...bindings).all()

  return {
    total,
    items: result.results as KeywordRecord[],
    page: params.page,
    totalPages
  }
}

// 모든 데이터 조회 (CSV용)
export async function getAllKeywordData(
  db: any, // D1Database 타입
  params: {
    query?: string
    dateFilter?: string
    compFilter?: string
    sortBy: string
    sortOrder: string
  }
): Promise<KeywordRecord[]> {
  // WHERE 조건 구성 (getKeywordData와 동일)
  const conditions: string[] = []
  const bindings: any[] = []

  if (params.query) {
    conditions.push('(keyword LIKE ? OR rel_keyword LIKE ?)')
    bindings.push(`%${params.query}%`, `%${params.query}%`)
  }

  if (params.dateFilter && params.dateFilter !== 'all') {
    const today = new Date()
    let cutoffDate: string
    
    switch (params.dateFilter) {
      case 'today':
        cutoffDate = today.toISOString().split('T')[0]
        break
      case '7days':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        cutoffDate = weekAgo.toISOString().split('T')[0]
        break
      case '30days':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        cutoffDate = monthAgo.toISOString().split('T')[0]
        break
      default:
        cutoffDate = '1900-01-01'
    }
    
    conditions.push('fetched_at >= ?')
    bindings.push(cutoffDate)
  }

  if (params.compFilter && params.compFilter !== 'all') {
    const compMap: { [key: string]: string } = {
      'high': '높음',
      'medium': '중간',
      'low': '낮음'
    }
    
    conditions.push('comp_idx = ?')
    bindings.push(compMap[params.compFilter])
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = `ORDER BY ${params.sortBy} ${params.sortOrder.toUpperCase()}`

  const result = await db.prepare(`
    SELECT * FROM keywords ${whereClause} ${orderBy}
  `).bind(...bindings).all()

  return result.results as KeywordRecord[]
}
