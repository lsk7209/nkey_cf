// Cloudflare Functions - 데이터 불러오기
export async function onRequestGet(context) {
  try {
    console.log('데이터 불러오기 요청 시작')
    const url = new URL(context.request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50')
    const query = url.searchParams.get('query') || ''
    const dateFilter = url.searchParams.get('dateFilter') || 'all'
    const compFilter = url.searchParams.get('compFilter') || 'all'
    const sortBy = url.searchParams.get('sortBy') || 'fetched_at'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    console.log('파라미터:', { page, pageSize, query, dateFilter, compFilter, sortBy, sortOrder })

    // KV 스토리지에서 모든 데이터 키 가져오기
    let keys = []
    try {
      const result = await context.env.KEYWORDS_KV.list({ prefix: 'data:' })
      keys = result.keys || []
      console.log('총 키 개수:', keys.length)
    } catch (listError) {
      console.error('키 목록 조회 오류:', listError)
      return new Response(JSON.stringify({ 
        error: '데이터 목록을 불러올 수 없습니다.',
        details: listError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 모든 데이터 로드
    const allData = []
    for (const key of keys) {
      try {
        const data = await context.env.KEYWORDS_KV.get(key.name)
        if (data) {
          const record = JSON.parse(data)
          allData.push({
            id: key.name, // 키를 ID로 사용
            ...record
          })
        }
      } catch (error) {
        console.error(`데이터 로드 오류 (${key.name}):`, error)
        // 개별 데이터 로드 실패는 무시하고 계속 진행
      }
    }

    console.log('로드된 데이터 개수:', allData.length)

    // 필터링
    let filteredData = allData

    // 키워드 검색 필터
    if (query) {
      filteredData = filteredData.filter(item => 
        item.keyword.toLowerCase().includes(query.toLowerCase()) ||
        item.rel_keyword.toLowerCase().includes(query.toLowerCase())
      )
    }

    // 날짜 필터
    if (dateFilter !== 'all') {
      const today = new Date()
      let cutoffDate = null
      
      switch (dateFilter) {
        case 'today':
          cutoffDate = today.toISOString().split('T')[0]
          break
        case '7days':
          cutoffDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
        case '30days':
          cutoffDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
      }
      
      if (cutoffDate) {
        filteredData = filteredData.filter(item => item.date_bucket >= cutoffDate)
      }
    }

    // 경쟁도 필터
    if (compFilter !== 'all') {
      const compMap = {
        'high': '높음',
        'medium': '중간',
        'low': '낮음'
      }
      const targetComp = compMap[compFilter]
      if (targetComp) {
        filteredData = filteredData.filter(item => item.comp_idx === targetComp)
      }
    }

    // 정렬
    filteredData.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      
      // 날짜 필드 처리
      if (sortBy === 'fetched_at' || sortBy === 'date_bucket') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    // 페이지네이션
    const total = filteredData.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedData = filteredData.slice(startIndex, endIndex)

    const result = {
      total,
      items: paginatedData,
      page,
      pageSize,
      totalPages
    }

    console.log('데이터 불러오기 완료:', { total, page, totalPages, itemsCount: paginatedData.length })
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('데이터 불러오기 오류:', error)
    return new Response(JSON.stringify({ 
      error: error.message || '데이터 불러오기 중 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
