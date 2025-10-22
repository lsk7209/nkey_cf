// Cloudflare Functions - SearchAd API
import { callSearchAdAPI } from '../../lib/naver-api.js'

export async function onRequestPost(context) {
  try {
    const { keywords } = await context.request.json()
    
    if (!keywords || !Array.isArray(keywords)) {
      return new Response(JSON.stringify({ error: '키워드 배열이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const result = await callSearchAdAPI(keywords)
    
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
