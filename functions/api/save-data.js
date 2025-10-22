// Cloudflare Functions - 데이터 저장
export async function onRequestPost(context) {
  try {
    console.log('데이터 저장 요청 시작')
    const { keyword, related } = await context.request.json()
    console.log('저장할 키워드:', keyword)
    console.log('관련 키워드 개수:', related?.length || 0)
    
    if (!keyword || !related || !Array.isArray(related)) {
      return new Response(JSON.stringify({ error: '키워드와 관련 데이터가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 현재 날짜와 시간
    const now = new Date()
    const dateBucket = now.toISOString().split('T')[0] // YYYY-MM-DD
    const fetchedAt = now.toISOString()

    // 저장된 데이터 개수
    let savedCount = 0

    // 각 관련 키워드 데이터를 저장
    for (const item of related) {
      try {
        // D1 데이터베이스에 저장 (실제 구현에서는 D1 사용)
        // 현재는 로컬 스토리지나 KV 스토리지 사용
        const record = {
          date_bucket: dateBucket,
          keyword: keyword,
          rel_keyword: item.rel_keyword,
          pc_search: item.pc_search,
          mobile_search: item.mobile_search,
          total_search: item.total_search || (item.pc_search + item.mobile_search),
          ctr_pc: item.ctr_pc,
          ctr_mo: item.ctr_mo,
          ad_count: item.ad_count,
          comp_idx: item.comp_idx,
          blog_count: item.blog_count,
          cafe_count: item.cafe_count,
          news_count: item.news_count,
          web_count: item.web_count,
          total_docs: item.total_docs,
          potential_score: item.potential_score,
          seed_usage: item.seed_usage || 'N/A',
          raw_json: JSON.stringify(item),
          fetched_at: fetchedAt
        }

        // KV 스토리지에 저장 (키: data:YYYY-MM-DD:keyword:rel_keyword)
        const storageKey = `data:${dateBucket}:${keyword}:${item.rel_keyword}`
        await context.env.KEYWORDS_KV.put(storageKey, JSON.stringify(record))
        
        savedCount++
        console.log(`저장 완료: ${storageKey}`)
      } catch (error) {
        console.error(`데이터 저장 오류 (${item.rel_keyword}):`, error)
      }
    }

    const result = {
      success: true,
      keyword,
      savedCount,
      totalCount: related.length,
      dateBucket,
      fetchedAt
    }

    console.log('데이터 저장 완료:', result)
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('데이터 저장 오류:', error)
    return new Response(JSON.stringify({ 
      error: error.message || '데이터 저장 중 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
