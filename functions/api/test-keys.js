// Cloudflare Functions - API 키 테스트
export async function onRequestGet(context) {
  try {
    const searchAdKeys = []
    const openApiKeys = []
    
    // SearchAd 키 확인
    for (let i = 1; i <= 10; i++) {
      const accessLicense = context.env[`SEARCHAD_ACCESS_LICENSE_${i}`]
      const secretKey = context.env[`SEARCHAD_SECRET_KEY_${i}`]
      const customerId = context.env[`SEARCHAD_CUSTOMER_ID_${i}`]
      
      if (accessLicense && secretKey && customerId) {
        searchAdKeys.push({
          id: i,
          hasLicense: !!accessLicense,
          hasSecret: !!secretKey,
          hasCustomer: !!customerId
        })
      }
    }
    
    // OpenAPI 키 확인
    for (let i = 1; i <= 10; i++) {
      const clientId = context.env[`NAVER_CLIENT_ID_${i}`]
      const clientSecret = context.env[`NAVER_CLIENT_SECRET_${i}`]
      
      if (clientId && clientSecret) {
        openApiKeys.push({
          id: i,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        })
      }
    }
    
    return new Response(JSON.stringify({
      searchAdKeys,
      openApiKeys,
      totalSearchAdKeys: searchAdKeys.length,
      totalOpenApiKeys: openApiKeys.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Key Test Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || '키 테스트 중 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
