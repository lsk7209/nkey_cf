// Cloudflare Functions - KV 스토리지 테스트
export async function onRequestGet(context) {
  try {
    console.log('KV 스토리지 테스트 시작')
    
    // 환경 변수 확인
    const envInfo = {
      KEYWORDS_KV: !!context.env.KEYWORDS_KV,
      KEYWORDS_KV_type: typeof context.env.KEYWORDS_KV,
      KEYWORDS_KV_methods: context.env.KEYWORDS_KV ? Object.getOwnPropertyNames(Object.getPrototypeOf(context.env.KEYWORDS_KV)) : [],
      envKeys: Object.keys(context.env || {}),
      timestamp: new Date().toISOString()
    }
    
    console.log('환경 정보:', envInfo)
    
    // KV 스토리지가 없으면 환경 정보만 반환
    if (!context.env.KEYWORDS_KV) {
      return new Response(JSON.stringify({
        success: false,
        message: 'KEYWORDS_KV 바인딩이 없습니다',
        envInfo,
        suggestion: 'wrangler.toml에서 KV 바인딩을 확인하세요'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
    
    // 테스트 데이터 저장 (Cloudflare 문서에 따른 방법)
    const testKey = 'test:kv:storage'
    const testData = {
      message: 'KV 스토리지 테스트',
      timestamp: new Date().toISOString(),
      success: true
    }
    
    console.log('테스트 데이터 저장 중...')
    await context.env.KEYWORDS_KV.put(testKey, JSON.stringify(testData), {
      expirationTtl: 60 * 60 // 1시간 후 만료
    })
    console.log('테스트 데이터 저장 완료')
    
    // 테스트 데이터 읽기
    console.log('테스트 데이터 읽기 중...')
    const retrievedData = await context.env.KEYWORDS_KV.get(testKey)
    console.log('읽어온 데이터:', retrievedData)
    
    // 키 목록 조회
    console.log('키 목록 조회 중...')
    const { keys } = await context.env.KEYWORDS_KV.list({ prefix: 'test:' })
    console.log('조회된 키 개수:', keys.length)
    
    const result = {
      success: true,
      message: 'KV 스토리지 테스트 성공',
      envInfo,
      testData: JSON.parse(retrievedData),
      keyCount: keys.length,
      timestamp: new Date().toISOString()
    }
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('KV 스토리지 테스트 오류:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'KV 스토리지 테스트 중 오류가 발생했습니다.',
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
