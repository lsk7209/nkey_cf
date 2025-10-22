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

    // 임시 모의 데이터 반환 (실제 API 연동 시 수정)
    const mockResult = {
      blog: Math.floor(Math.random() * 50000) + 10000,
      cafe: Math.floor(Math.random() * 10000) + 2000,
      news: Math.floor(Math.random() * 2000) + 500,
      web: Math.floor(Math.random() * 15000) + 5000
    }
    
    return new Response(JSON.stringify(mockResult), {
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
