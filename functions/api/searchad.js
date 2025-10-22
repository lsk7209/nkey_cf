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

    // 임시 모의 데이터 반환 (실제 API 연동 시 수정)
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
