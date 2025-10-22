// Cloudflare Functions - 디버그 로그 확인
export async function onRequestGet(context) {
  try {
    console.log('디버그 로그 확인 시작')
    
    // 환경 변수 상태 확인
    const envStatus = {
      searchAdKeys: [],
      openApiKeys: [],
      timestamp: new Date().toISOString()
    }
    
    // SearchAd 키 상태
    for (let i = 1; i <= 10; i++) {
      const accessLicense = context.env[`SEARCHAD_ACCESS_LICENSE_${i}`]
      const secretKey = context.env[`SEARCHAD_SECRET_KEY_${i}`]
      const customerId = context.env[`SEARCHAD_CUSTOMER_ID_${i}`]
      
      envStatus.searchAdKeys.push({
        id: i,
        hasLicense: !!accessLicense,
        hasSecret: !!secretKey,
        hasCustomer: !!customerId,
        licenseLength: accessLicense ? accessLicense.length : 0,
        secretLength: secretKey ? secretKey.length : 0,
        customerLength: customerId ? customerId.length : 0,
        licensePreview: accessLicense ? accessLicense.substring(0, 8) + '...' : '없음',
        secretPreview: secretKey ? secretKey.substring(0, 8) + '...' : '없음',
        customerPreview: customerId ? customerId.substring(0, 8) + '...' : '없음'
      })
    }
    
    // OpenAPI 키 상태
    for (let i = 1; i <= 10; i++) {
      const clientId = context.env[`NAVER_CLIENT_ID_${i}`]
      const clientSecret = context.env[`NAVER_CLIENT_SECRET_${i}`]
      
      envStatus.openApiKeys.push({
        id: i,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdLength: clientId ? clientId.length : 0,
        clientSecretLength: clientSecret ? clientSecret.length : 0,
        clientIdPreview: clientId ? clientId.substring(0, 8) + '...' : '없음',
        clientSecretPreview: clientSecret ? clientSecret.substring(0, 8) + '...' : '없음'
      })
    }
    
    // 사용 가능한 키 개수
    const availableSearchAdKeys = envStatus.searchAdKeys.filter(key => 
      key.hasLicense && key.hasSecret && key.hasCustomer
    ).length
    
    const availableOpenApiKeys = envStatus.openApiKeys.filter(key => 
      key.hasClientId && key.hasClientSecret
    ).length
    
    // 실제 API 테스트
    let apiTestResults = {
      searchAdTest: null,
      openApiTest: null
    }
    
    // SearchAd API 테스트
    if (availableSearchAdKeys > 0) {
      try {
        const testKeyword = '마케팅'
        const timestamp = Date.now().toString()
        const method = 'GET'
        const uri = '/keywordstool'
        const queryParams = new URLSearchParams({
          hintKeywords: testKeyword,
          showDetail: '1'
        })
        const fullUri = `${uri}?${queryParams.toString()}`
        
        const firstKey = envStatus.searchAdKeys.find(key => 
          key.hasLicense && key.hasSecret && key.hasCustomer
        )
        
        if (firstKey) {
          const accessLicense = context.env[`SEARCHAD_ACCESS_LICENSE_${firstKey.id}`]
          const secretKey = context.env[`SEARCHAD_SECRET_KEY_${firstKey.id}`]
          const customerId = context.env[`SEARCHAD_CUSTOMER_ID_${firstKey.id}`]
          
          const message = `${timestamp}.${method}.${uri}`
          const encoder = new TextEncoder()
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secretKey),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          )
          const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
          const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
          
          const response = await fetch(`https://api.naver.com${fullUri}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              'X-Timestamp': timestamp,
              'X-API-KEY': accessLicense,
              'X-Customer': customerId,
              'X-Signature': signatureBase64,
            }
          })
          
          apiTestResults.searchAdTest = {
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            responseText: await response.text()
          }
        }
      } catch (error) {
        apiTestResults.searchAdTest = {
          error: error.message,
          success: false
        }
      }
    }
    
    // OpenAPI 테스트
    if (availableOpenApiKeys > 0) {
      try {
        const testKeyword = '마케팅'
        const firstKey = envStatus.openApiKeys.find(key => 
          key.hasClientId && key.hasClientSecret
        )
        
        if (firstKey) {
          const clientId = context.env[`NAVER_CLIENT_ID_${firstKey.id}`]
          const clientSecret = context.env[`NAVER_CLIENT_SECRET_${firstKey.id}`]
          
          const response = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(testKeyword)}&display=1`, {
            headers: {
              'X-Naver-Client-Id': clientId,
              'X-Naver-Client-Secret': clientSecret,
            }
          })
          
          apiTestResults.openApiTest = {
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            responseText: await response.text()
          }
        }
      } catch (error) {
        apiTestResults.openApiTest = {
          error: error.message,
          success: false
        }
      }
    }
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: context.env.ENVIRONMENT || 'unknown',
      availableSearchAdKeys,
      availableOpenApiKeys,
      searchAdKeys: envStatus.searchAdKeys,
      openApiKeys: envStatus.openApiKeys,
      apiTestResults,
      message: '디버그 정보가 성공적으로 수집되었습니다.'
    }
    
    console.log('디버그 정보:', debugInfo)
    
    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('디버그 로그 오류:', error)
    return new Response(JSON.stringify({ 
      error: error.message || '디버그 로그 수집 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
