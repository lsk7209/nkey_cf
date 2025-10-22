// Cloudflare Functions - 대량 문서수 업데이트
export async function onRequestPost(context) {
  const { env } = context;

  try {
    console.log('대량 문서수 업데이트 시작');

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
    
    console.log(`업데이트할 데이터 키 개수: ${keys.length}개`);

    if (keys.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "업데이트할 데이터가 없습니다",
        updatedCount: 0
      }), {
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    let updatedCount = 0;
    let errorCount = 0;
    const now = new Date().toISOString();

    // 배치로 업데이트 처리 (한 번에 10개씩)
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(keys.length / BATCH_SIZE);

    for (let batchStart = 0; batchStart < keys.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, keys.length);
      const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
      
      console.log(`문서수 업데이트 배치 ${batchNumber}/${totalBatches} 처리 중: ${batchStart + 1}-${batchEnd}번째 키`);

      // 배치 내 키들 처리
      for (let i = batchStart; i < batchEnd; i++) {
        const key = keys[i];
        try {
          const data = await env.KEYWORDS_KV.get(key.name);
          if (!data) continue;

          const record = JSON.parse(data);
          const relKeyword = record.rel_keyword;

          if (!relKeyword) continue;

          // 이미 문서수가 있는 경우 스킵
          if (record.blog_count > 0 || record.cafe_count > 0) {
            console.log(`문서수 이미 존재: ${relKeyword}`);
            continue;
          }

          console.log(`문서수 수집 중: ${relKeyword}`);

          // OpenAPI 호출하여 문서수 정보 가져오기
          const query = encodeURIComponent(relKeyword);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const openApiResponse = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${query}&display=1`, {
            method: 'GET',
            headers: {
              'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
              'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (openApiResponse.ok) {
            const openApiData = await openApiResponse.json();
            const blogCount = openApiData.total || 0;
            
            // 기존 데이터 업데이트
            const updatedRecord = {
              ...record,
              blog_count: blogCount,
              total_docs: blogCount + (record.cafe_count || 0) + (record.news_count || 0) + (record.web_count || 0),
              potential_score: record.total_docs > 0 ? ((record.pc_search + record.mobile_search) / record.total_docs) * 100 : 0,
              updated_at: now,
              doc_updated_at: now
            };

            // KV에 저장
            await env.KEYWORDS_KV.put(key.name, JSON.stringify(updatedRecord), {
              expirationTtl: 60 * 60 * 24 * 30 // 30일
            });

            updatedCount++;
            console.log(`문서수 업데이트 완료: ${relKeyword} (블로그: ${blogCount})`);
          } else {
            console.log(`OpenAPI 호출 실패: ${openApiResponse.status}`);
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`문서수 업데이트 오류 (${key.name}):`, error.message);
        }

        // API 호출 간격 조절
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms 대기
      }

      // 배치 간 대기
      if (batchEnd < keys.length) {
        console.log(`배치 ${batchNumber} 완료. 다음 배치 준비 중...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      }
    }

    const result = {
      success: true,
      message: `대량 문서수 업데이트 완료: ${updatedCount}개 업데이트됨${errorCount > 0 ? `, ${errorCount}개 오류` : ''}`,
      updatedCount,
      errorCount,
      totalKeys: keys.length,
      timestamp: now
    };

    console.log('대량 문서수 업데이트 결과:', result);

    return new Response(JSON.stringify(result), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('대량 문서수 업데이트 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
      message: "문서수 업데이트 중 오류가 발생했습니다"
    }), { 
      status: 500,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });
  }
}
