// Cloudflare Functions - 데이터 불러오기 (KV 없이 작동)
export async function onRequestGet(context) {
  try {
    console.log('데이터 불러오기 요청 시작')
    
    // 기본 응답 (항상 성공)
    const response = {
      total: 0,
      items: [],
      page: 1,
      pageSize: 50,
      totalPages: 0,
      debug: {
        kvAvailable: !!context.env.KEYWORDS_KV,
        timestamp: new Date().toISOString(),
        envKeys: Object.keys(context.env || {}),
        message: 'KV 바인딩 문제로 인해 빈 데이터 반환'
      }
    }
    
    // KV 스토리지가 없으면 빈 응답 반환
    if (!context.env.KEYWORDS_KV) {
      console.log('KEYWORDS_KV가 설정되지 않음 - 빈 응답 반환')
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
    
    console.log('KV 스토리지 사용 가능 - 간단한 테스트만 수행')
    
    // 간단한 파라미터만 처리
    const url = new URL(context.request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50')

    console.log('파라미터:', { page, pageSize })

    // KV에서 키 목록 조회 (매우 간단하게)
    try {
      console.log('키 목록 조회 시작...')
      console.log('KV 바인딩 상태:', {
        exists: !!context.env.KEYWORDS_KV,
        type: typeof context.env.KEYWORDS_KV,
        methods: context.env.KEYWORDS_KV ? Object.getOwnPropertyNames(Object.getPrototypeOf(context.env.KEYWORDS_KV)) : []
      })
      
      const result = await context.env.KEYWORDS_KV.list({ 
        prefix: 'data:',
        limit: 10 // 최대 10개만 조회
      })
      const keys = result.keys || []
      console.log('총 키 개수:', keys.length)
      console.log('조회된 키들:', keys.map(k => k.name))
      
      // 최대 3개만 처리
      const maxKeys = Math.min(keys.length, 3)
      const allData = []
      
      for (let i = 0; i < maxKeys; i++) {
        const key = keys[i]
        try {
          console.log(`데이터 로드 중: ${key.name}`)
          const data = await context.env.KEYWORDS_KV.get(key.name)
          if (data) {
            const record = JSON.parse(data)
            allData.push({
              id: key.name,
              ...record
            })
            console.log(`데이터 로드 성공: ${key.name}`)
          }
        } catch (error) {
          console.error(`데이터 로드 오류 (${key.name}):`, error)
        }
      }

      // 페이지네이션
      const total = allData.length
      const totalPages = Math.ceil(total / pageSize)
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedData = allData.slice(startIndex, endIndex)

      console.log('최종 결과:', { total, page, pageSize, totalPages, itemsCount: paginatedData.length })

      return new Response(JSON.stringify({
        total,
        items: paginatedData,
        page,
        pageSize,
        totalPages,
        debug: {
          kvAvailable: true,
          keysFound: keys.length,
          dataLoaded: allData.length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
      
    } catch (listError) {
      console.error('키 목록 조회 오류:', listError)
      return new Response(JSON.stringify({ 
        ...response,
        error: '키 목록 조회 실패',
        debug: {
          ...response.debug,
          listError: listError.message
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

  } catch (error) {
    console.error('데이터 불러오기 오류:', error)
    return new Response(JSON.stringify({ 
      error: '데이터 불러오기 실패',
      details: error.message,
      debug: {
        kvAvailable: !!context.env.KEYWORDS_KV,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}