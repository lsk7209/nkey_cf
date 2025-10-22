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
        customerLength: customerId ? customerId.length : 0
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
        clientSecretLength: clientSecret ? clientSecret.length : 0
      })
    }
    
    // 사용 가능한 키 개수
    const availableSearchAdKeys = envStatus.searchAdKeys.filter(key => 
      key.hasLicense && key.hasSecret && key.hasCustomer
    ).length
    
    const availableOpenApiKeys = envStatus.openApiKeys.filter(key => 
      key.hasClientId && key.hasClientSecret
    ).length
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: context.env.ENVIRONMENT || 'unknown',
      availableSearchAdKeys,
      availableOpenApiKeys,
      searchAdKeys: envStatus.searchAdKeys,
      openApiKeys: envStatus.openApiKeys,
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
