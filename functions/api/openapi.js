// Cloudflare Functions - OpenAPI
import { callOpenAPI } from '../../lib/naver-api.js'

export async function onRequestPost(context) {
  try {
    const { keyword } = await context.request.json()
    
    if (!keyword) {
      return new Response(JSON.stringify({ error: '키워드가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const result = await callOpenAPI(keyword)
    
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
