// Cloudflare Functions - SearchAd API
export async function onRequestPost(context) {
  try {
    console.log('SearchAd API 호출 시작')
    const { keywords } = await context.request.json()
    console.log('받은 키워드:', keywords)
    
    if (!keywords || !Array.isArray(keywords)) {
      return new Response(JSON.stringify({ error: '키워드 배열이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 실제 Naver SearchAd API 호출
    const apiKey = getAvailableSearchAdKey(context.env)
    console.log('사용할 API 키:', apiKey ? '발견됨' : '없음')
    
    if (!apiKey) {
      console.log('API 키가 없어서 모의 데이터 반환')
      // API 키가 없으면 모의 데이터 반환
      const mockResult = {
        keywordList: keywords.map(keyword => ({
          relKeyword: `${keyword} 관련키워드`,
          monthlyPcQcCnt: Math.floor(Math.random() * 5000) + 1000,
          monthlyMobileQcCnt: Math.floor(Math.random() * 10000) + 5000,
          plAvgCpc: Math.random() * 5 + 1,
          moAvgCpc: Math.random() * 5 + 2,
          competition: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)]
        }))
      }
      return new Response(JSON.stringify(mockResult), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const timestamp = Date.now().toString()
    const method = 'GET'
    const uri = '/keywordstool'
    
    // 쿼리 파라미터 생성
    const hintKeywords = keywords.join(',')
    const queryParams = new URLSearchParams({
      hintKeywords: hintKeywords,
      showDetail: '1'
    })
    const fullUri = `${uri}?${queryParams.toString()}`
    
    // HMAC-SHA256 시그니처 생성 (URI만 사용, 쿼리 파라미터 제외)
    const message = `${timestamp}.${method}.${uri}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiKey.secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    
    console.log('Naver SearchAd API 호출 중...')
    console.log('요청 URL:', `https://api.naver.com${fullUri}`)
    console.log('시그니처 메시지:', message)
    console.log('타임스탬프:', timestamp)
    console.log('Access License:', apiKey.accessLicense.substring(0, 8) + '...')
    console.log('Customer ID:', apiKey.customerId)
    console.log('시그니처:', signatureBase64.substring(0, 20) + '...')
    
    const response = await fetch(`https://api.naver.com${fullUri}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Timestamp': timestamp,
        'X-API-KEY': apiKey.accessLicense,
        'X-Customer': apiKey.customerId,
        'X-Signature': signatureBase64,
      }
    })

    console.log('API 응답 상태:', response.status)

    if (!response.ok) {
      console.log('API 호출 실패:', response.status)
      const errorText = await response.text()
      console.log('에러 응답 내용:', errorText)
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (response.status === 403) {
        return new Response(JSON.stringify({ 
          error: `SearchAd API 인증 오류 (403): ${errorText}`,
          details: {
            timestamp,
            message,
            accessLicense: apiKey.accessLicense.substring(0, 8) + '...',
            customerId: apiKey.customerId
          }
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ 
        error: `SearchAd API 오류: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const result = await response.json()
    console.log('API 응답 성공:', result)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('SearchAd API Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'SearchAd API 호출 중 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// 사용 가능한 SearchAd 키 선택
function getAvailableSearchAdKey(env) {
  for (let i = 1; i <= 10; i++) {
    const accessLicense = env[`SEARCHAD_ACCESS_LICENSE_${i}`]
    const secretKey = env[`SEARCHAD_SECRET_KEY_${i}`]
    const customerId = env[`SEARCHAD_CUSTOMER_ID_${i}`]
    
    if (accessLicense && secretKey && customerId) {
      return {
        accessLicense,
        secretKey,
        customerId
      }
    }
  }
  return null
}
