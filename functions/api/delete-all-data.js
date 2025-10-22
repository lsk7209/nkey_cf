// Cloudflare Functions - 모든 데이터 삭제
export async function onRequestDelete(context) {
  const { env } = context;

  try {
    console.log('전체 데이터 삭제 요청 시작');

    // KV 바인딩 확인
    if (!env.KEYWORDS_KV) {
      return new Response(JSON.stringify({
        success: false,
        message: "KV 바인딩이 없습니다"
      }), { 
        status: 500,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 모든 데이터 키 조회
    const list = await env.KEYWORDS_KV.list({ prefix: "data:", limit: 1000 });
    const keys = list?.keys || [];
    
    console.log(`삭제할 데이터 키 개수: ${keys.length}개`);

    if (keys.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "삭제할 데이터가 없습니다",
        deletedCount: 0
      }), {
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    let deletedCount = 0;
    let errorCount = 0;

    // 배치로 삭제 처리 (한 번에 50개씩)
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(keys.length / BATCH_SIZE);

    for (let batchStart = 0; batchStart < keys.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, keys.length);
      const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
      
      console.log(`삭제 배치 ${batchNumber}/${totalBatches} 처리 중: ${batchStart + 1}-${batchEnd}번째 키`);

      // 배치 내 키들 삭제
      for (let i = batchStart; i < batchEnd; i++) {
        const key = keys[i];
        try {
          await env.KEYWORDS_KV.delete(key.name);
          deletedCount++;
          console.log(`삭제 완료: ${key.name}`);
        } catch (error) {
          errorCount++;
          console.error(`삭제 오류 (${key.name}):`, error.message);
        }
      }

      // 배치 간 대기 (KV 부하 방지)
      if (batchEnd < keys.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 작업 상태도 삭제
    try {
      const jobList = await env.KEYWORDS_KV.list({ prefix: "job:", limit: 100 });
      for (const jobKey of jobList.keys) {
        await env.KEYWORDS_KV.delete(jobKey.name);
        console.log(`작업 상태 삭제: ${jobKey.name}`);
      }
    } catch (jobError) {
      console.error('작업 상태 삭제 오류:', jobError);
    }

    const result = {
      success: true,
      message: `전체 데이터 삭제 완료: ${deletedCount}개 삭제됨${errorCount > 0 ? `, ${errorCount}개 오류` : ''}`,
      deletedCount,
      errorCount,
      totalKeys: keys.length,
      timestamp: new Date().toISOString()
    };

    console.log('전체 데이터 삭제 결과:', result);

    return new Response(JSON.stringify(result), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('전체 데이터 삭제 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
      message: "데이터 삭제 중 오류가 발생했습니다"
    }), { 
      status: 500,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });
  }
}

// GET 요청으로 삭제 예상 개수 확인
export async function onRequestGet(context) {
  const { env } = context;

  try {
    if (!env.KEYWORDS_KV) {
      return new Response(JSON.stringify({
        success: false,
        message: "KV 바인딩이 없습니다"
      }), { 
        status: 500,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 데이터 키 개수 조회
    const list = await env.KEYWORDS_KV.list({ prefix: "data:", limit: 1000 });
    const keys = list?.keys || [];

    return new Response(JSON.stringify({
      success: true,
      totalKeys: keys.length,
      message: `삭제 예상 개수: ${keys.length}개`,
      timestamp: new Date().toISOString()
    }), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('삭제 예상 개수 조회 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), { 
      status: 500,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });
  }
}
