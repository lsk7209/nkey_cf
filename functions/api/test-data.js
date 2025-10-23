// Cloudflare Functions - 데이터 테스트
export async function onRequestGet(context) {
  const { env } = context;

  try {
    console.log('데이터 테스트 시작');
    
    // KV 바인딩 확인
    const kvAvailable = !!env.KEYWORDS_KV;
    console.log('KV 바인딩 상태:', kvAvailable);
    
    if (!kvAvailable) {
      return new Response(JSON.stringify({
        success: false,
        message: "KEYWORDS_KV 바인딩이 없습니다",
        kvAvailable: false,
        timestamp: new Date().toISOString()
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // KV에서 키 목록 조회
    console.log('키 목록 조회 시작...');
    const result = await env.KEYWORDS_KV.list({ 
      prefix: 'data:',
      limit: 10 // 테스트용으로 10개만
    });
    
    console.log('조회된 키 개수:', result.keys?.length || 0);
    console.log('키 목록:', result.keys?.map(k => k.name) || []);
    
    // 첫 번째 키의 데이터 조회
    let sampleData = null;
    if (result.keys && result.keys.length > 0) {
      const firstKey = result.keys[0];
      console.log('첫 번째 키 데이터 조회:', firstKey.name);
      
      const data = await env.KEYWORDS_KV.get(firstKey.name);
      if (data) {
        try {
          sampleData = JSON.parse(data);
          console.log('샘플 데이터:', sampleData);
        } catch (e) {
          console.error('JSON 파싱 오류:', e);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      kvAvailable: true,
      totalKeys: result.keys?.length || 0,
      keys: result.keys?.map(k => k.name) || [],
      sampleData,
      timestamp: new Date().toISOString()
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('데이터 테스트 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
