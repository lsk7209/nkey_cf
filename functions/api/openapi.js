// Cloudflare Functions - OpenAPI
export async function onRequestPost(context) {
  try {
    const { keyword } = await context.request.json()
    
    if (!keyword) {
      return new Response(JSON.stringify({ error: '키워드가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 실제 Naver OpenAPI 호출
    const apiKey = getAvailableOpenApiKey(context.env)
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '사용 가능한 OpenAPI 키가 없습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const baseUrl = 'https://openapi.naver.com/v1/search'
    const headers = {
      'X-Naver-Client-Id': apiKey.clientId,
      'X-Naver-Client-Secret': apiKey.clientSecret,
    }

    // 병렬로 4개 API 호출
    const [blogRes, cafeRes, newsRes, webRes] = await Promise.all([
      fetch(`${baseUrl}/blog.json?query=${encodeURIComponent(keyword)}&display=100`, { headers }),
      fetch(`${baseUrl}/cafearticle.json?query=${encodeURIComponent(keyword)}&display=100`, { headers }),
      fetch(`${baseUrl}/news.json?query=${encodeURIComponent(keyword)}&display=100`, { headers }),
      fetch(`${baseUrl}/webkr.json?query=${encodeURIComponent(keyword)}&display=100`, { headers })
    ])

    // 에러 체크
    if (!blogRes.ok || !cafeRes.ok || !newsRes.ok || !webRes.ok) {
      if (blogRes.status === 429 || cafeRes.status === 429 || newsRes.status === 429 || webRes.status === 429) {
        return new Response(JSON.stringify({ error: 'OpenAPI 호출 제한에 도달했습니다.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ error: 'OpenAPI 호출 중 오류가 발생했습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const [blogData, cafeData, newsData, webData] = await Promise.all([
      blogRes.json(),
      cafeRes.json(),
      newsRes.json(),
      webRes.json()
    ])

    const result = {
      blog: blogData.total || 0,
      cafe: cafeData.total || 0,
      news: newsData.total || 0,
      web: webData.total || 0
    }
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('OpenAPI Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'OpenAPI 호출 중 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// 사용 가능한 OpenAPI 키 선택
function getAvailableOpenApiKey(env) {
  for (let i = 1; i <= 10; i++) {
    const clientId = env[`NAVER_CLIENT_ID_${i}`]
    const clientSecret = env[`NAVER_CLIENT_SECRET_${i}`]
    
    if (clientId && clientSecret) {
      return {
        clientId,
        clientSecret
      }
    }
  }
  return null
}
