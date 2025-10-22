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

    // 3) 저장 로직
    const now = new Date();
    const dateBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;
    const fetchedAt = now.toISOString();
    let savedCount = 0;

    for (const item of related) {
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
            console.log(`문서수 정보 수집 중: ${rel}`);
            
            // OpenAPI 호출하여 문서수 정보 가져오기
            const query = encodeURIComponent(rel);
            const openApiResponse = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${query}&display=1`, {
              method: 'GET',
              headers: {
                'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET
              }
            });
            
            if (openApiResponse.ok) {
              const openApiData = await openApiResponse.json();
              blogCount = openApiData.total || 0;
              console.log(`블로그 문서수: ${blogCount}`);
            } else {
              console.log(`OpenAPI 호출 실패: ${openApiResponse.status}`);
            }
          } catch (docError) {
            console.error(`문서수 수집 오류 (${rel}):`, docError);
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
          console.log(`저장 시도: ${storageKey}`);
          
          // Cloudflare KV 문서에 따른 저장 방법
          const putResult = await env.KEYWORDS_KV.put(storageKey, JSON.stringify(record), {
            expirationTtl: 60 * 60 * 24 * 30 // 30일 후 만료
          });
          
          console.log(`저장 결과:`, putResult);
          savedCount++;
          console.log(`저장 완료: ${storageKey}`);
        } catch (saveError) {
          console.error(`KV 저장 오류 (${storageKey}):`, saveError);
          console.error(`오류 상세:`, {
            message: saveError.message,
            stack: saveError.stack,
            name: saveError.name
          });
        }
      } catch (error) {
        console.error(`데이터 저장 오류 (${rel}):`, error);
      }
    }

    const result = {
      success: true,
      keyword,
      savedCount,
      totalCount: related.length,
      dateBucket,
      fetchedAt,
      debug: {
        kvAvailable: true,
        autoUpdateDocuments,
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