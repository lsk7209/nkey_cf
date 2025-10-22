// Cloudflare Functions - SearchAd API
export async function onRequestPost(context) {
  try {
    const { keywords } = await context.request.json()
    
    if (!keywords || !Array.isArray(keywords)) {
      return new Response(JSON.stringify({ error: '키워드 배열이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 실제 Naver SearchAd API 호출
    const apiKey = getAvailableSearchAdKey(context.env)
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '사용 가능한 SearchAd API 키가 없습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const timestamp = Date.now().toString()
    const method = 'POST'
    const uri = '/keywordstool'
    
    // HMAC-SHA256 시그니처 생성
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
    
    const response = await fetch('https://api.naver.com/keywordstool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-API-KEY': apiKey.accessLicense,
        'X-Customer': apiKey.customerId,
        'X-Signature': signatureBase64,
      },
      body: JSON.stringify({
        hintKeywords: keywords,
        showDetail: 1
      })
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ error: `SearchAd API 오류: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const result = await response.json()
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
