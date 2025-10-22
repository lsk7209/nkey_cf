// Cloudflare Functions - 데이터 저장 (개선된 버전)
export async function onRequestPost(context) {
  const { request, env } = context;

  // 0) KV 존재 체크(운영에서 반드시 true 이어야 함)
  const kvAvailable = !!env.KEYWORDS_KV;

  try {
    const body = await request.json().catch(() => ({}));
    const keyword = body?.keyword ?? "";
    const related = Array.isArray(body?.related) ? body.related : [];
    const autoUpdateDocuments = body?.autoUpdateDocuments || false;

    console.log('저장 요청:', { keyword, relatedCount: related.length, autoUpdateDocuments, kvAvailable });

    // 1) 파라미터 검증
    if (!keyword || related.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "keyword 또는 related가 비어있음",
        kvAvailable
      }), { 
        status: 400,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 2) 시뮬레이션 분기(운영에서 kvAvailable=false면 바인딩 문제)
    if (!kvAvailable) {
      return new Response(JSON.stringify({
        success: true,
        simulation: true,
        savedCount: 0,
        totalCount: related.length,
        reason: "KEYWORDS_KV not bound",
        debug: {
          kvAvailable: false,
          envKeys: Object.keys(env || {}),
          timestamp: new Date().toISOString()
        }
      }), { 
        status: 200,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 3) 배치 저장 로직 (타임아웃 방지를 위해 배치 처리)
    const BATCH_SIZE = 20; // 한 번에 20개씩 처리
    const maxItems = Math.min(related.length, 500);
    const now = new Date();
    const dateBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;
    const fetchedAt = now.toISOString();
    let savedCount = 0;
    let errorCount = 0;

    console.log(`배치 저장 시작: 총 ${related.length}개 중 최대 ${maxItems}개 처리 (배치 크기: ${BATCH_SIZE})`);

    // 배치별로 처리
    for (let batchStart = 0; batchStart < maxItems; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, maxItems);
      const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(maxItems / BATCH_SIZE);
      
      console.log(`배치 ${batchNumber}/${totalBatches} 처리 중: ${batchStart + 1}-${batchEnd}번째 항목`);

      for (let i = batchStart; i < batchEnd; i++) {
        const item = related[i];
        const rel = item?.rel_keyword ?? "";
        if (!rel) continue;

      try {
        // 문서수 자동 업데이트가 활성화된 경우 OpenAPI 호출
        let blogCount = item.blog_count || 0;
        let cafeCount = item.cafe_count || 0;
        let newsCount = item.news_count || 0;
        let webCount = item.web_count || 0;
        let totalDocs = item.total_docs || 0;
        let potentialScore = item.potential_score || 0;

        if (autoUpdateDocuments && rel) {
          try {
            console.log(`문서수 정보 수집 중 (${i+1}/${maxItems}): ${rel}`);
            
            // OpenAPI 호출하여 문서수 정보 가져오기 (타임아웃 5초)
            const query = encodeURIComponent(rel);
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
              blogCount = openApiData.total || 0;
              console.log(`블로그 문서수: ${blogCount}`);
            } else {
              console.log(`OpenAPI 호출 실패: ${openApiResponse.status}`);
            }
          } catch (docError) {
            console.error(`문서수 수집 오류 (${rel}):`, docError.message);
            // OpenAPI 오류가 있어도 기본값으로 저장 계속 진행
          }
        }

        // 총 문서수 및 잠재력 점수 계산
        totalDocs = blogCount + cafeCount + newsCount + webCount;
        if (totalDocs > 0) {
          potentialScore = ((item.pc_search + item.mobile_search) / totalDocs) * 100;
        }

        const record = {
          keyword,
          rel_keyword: rel,
          pc_search: item.pc_search || 0,
          mobile_search: item.mobile_search || 0,
          total_search: (item.pc_search || 0) + (item.mobile_search || 0),
          cafe_count: cafeCount,
          blog_count: blogCount,
          web_count: webCount,
          news_count: newsCount,
          total_docs: totalDocs,
          potential_score: potentialScore,
          ctr_pc: item.ctr_pc || 0,
          ctr_mo: item.ctr_mo || 0,
          ad_count: item.ad_count || 0,
          comp_idx: item.comp_idx || 'N/A',
          seed_usage: item.seed_usage || 'N/A',
          raw_json: JSON.stringify(item),
          fetched_at: fetchedAt
        };

        const storageKey = `data:${dateBucket}:${keyword}:${rel}`;
        
        try {
          console.log(`저장 시도 (${i+1}/${maxItems}): ${storageKey}`);
          
          // 중복 체크 (기존 데이터가 있는지 확인)
          const existingData = await env.KEYWORDS_KV.get(storageKey);
          const isUpdate = !!existingData;
          
          if (isUpdate) {
            console.log(`중복 키워드 발견 - 덮어쓰기: ${rel}`);
            // 기존 데이터가 있으면 업데이트 시간 추가
            record.updated_at = fetchedAt;
            record.is_update = true;
          } else {
            record.created_at = fetchedAt;
            record.is_update = false;
          }
          
          // Cloudflare KV 문서에 따른 저장 방법 (덮어쓰기)
          const putResult = await env.KEYWORDS_KV.put(storageKey, JSON.stringify(record), {
            expirationTtl: 60 * 60 * 24 * 30 // 30일 후 만료
          });
          
          savedCount++;
          console.log(`${isUpdate ? '업데이트' : '신규 저장'} 완료 (${savedCount}/${maxItems}): ${rel}`);
        } catch (saveError) {
          errorCount++;
          console.error(`KV 저장 오류 (${storageKey}):`, saveError.message);
        }
      } catch (error) {
        errorCount++;
        console.error(`데이터 저장 오류 (${rel}):`, error.message);
      }
      } // 배치 내부 루프 종료
      
      // 배치 간 짧은 대기 (타임아웃 방지)
      if (batchEnd < maxItems) {
        console.log(`배치 ${batchNumber} 완료. 다음 배치 준비 중...`);
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
      }
    } // 배치 루프 종료

    const result = {
      success: true,
      keyword,
      savedCount,
      totalCount: related.length,
      maxItems,
      errorCount,
      batchSize: BATCH_SIZE,
      totalBatches: Math.ceil(maxItems / BATCH_SIZE),
      dateBucket,
      fetchedAt,
      message: `배치 처리 완료: 총 ${related.length}개 중 ${maxItems}개 처리, ${savedCount}개 저장 완료${errorCount > 0 ? ` (${errorCount}개 오류)` : ''}`,
      debug: {
        kvAvailable: true,
        autoUpdateDocuments,
        overwriteMode: true,
        batchProcessing: true,
        timestamp: new Date().toISOString()
      }
    };

    console.log('저장 완료 결과:', result);

    return new Response(JSON.stringify(result), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('데이터 저장 요청 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
      kvAvailable
    }), { 
      status: 500, 
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });
  }
}