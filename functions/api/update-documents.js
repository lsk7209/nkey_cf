// Cloudflare Functions - 문서수 자동 업데이트
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const keyword = body?.keyword || "";
    const limit = Math.min(body?.limit || 50, 100); // 최대 100개까지

    console.log(`문서수 업데이트 시작: ${keyword}, 제한: ${limit}개`);

    // OpenAPI 키 확인
    if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) {
      console.error('OpenAPI 키가 설정되지 않음:', {
        hasClientId: !!env.NAVER_CLIENT_ID,
        hasClientSecret: !!env.NAVER_CLIENT_SECRET
      });
      return new Response(JSON.stringify({
        success: false,
        message: "OpenAPI 키가 설정되지 않았습니다",
        debug: {
          hasClientId: !!env.NAVER_CLIENT_ID,
          hasClientSecret: !!env.NAVER_CLIENT_SECRET
        }
      }), { 
        status: 400,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (!keyword) {
      return new Response(JSON.stringify({
        success: false,
        message: "키워드가 필요합니다"
      }), { 
        status: 400,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 해당 키워드의 모든 데이터 조회
    const list = await env.KEYWORDS_KV.list({ 
      prefix: `data:`, 
      limit: 1000 
    });
    
    const keywordData = [];
    for (const key of list.keys) {
      if (key.name.includes(`:${keyword}:`)) {
        const data = await env.KEYWORDS_KV.get(key.name);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            keywordData.push({
              key: key.name,
              data: parsed
            });
          } catch (e) {
            console.error(`JSON 파싱 오류: ${key.name}`, e);
          }
        }
      }
    }

    console.log(`찾은 키워드 데이터: ${keywordData.length}개`);

    let updatedCount = 0;
    let errorCount = 0;
    const now = new Date().toISOString();

    // 문서수 업데이트 처리
    for (let i = 0; i < Math.min(keywordData.length, limit); i++) {
      const { key, data } = keywordData[i];
      const relKeyword = data.rel_keyword;

      if (!relKeyword) continue;

      try {
        console.log(`문서수 수집 중 (${i+1}/${Math.min(keywordData.length, limit)}): ${relKeyword}`);

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
          
          console.log(`OpenAPI 응답 성공: ${relKeyword} - 블로그 ${blogCount}개`);
          
          // 기존 데이터 업데이트
          const newTotalDocs = blogCount + (data.cafe_count || 0) + (data.news_count || 0) + (data.web_count || 0);
          const newPotentialScore = newTotalDocs > 0 ? ((data.pc_search + data.mobile_search) / newTotalDocs) * 100 : 0;
          
          const updatedData = {
            ...data,
            blog_count: blogCount,
            total_docs: newTotalDocs,
            potential_score: newPotentialScore,
            updated_at: now,
            doc_updated_at: now
          };

          // KV에 저장
          await env.KEYWORDS_KV.put(key, JSON.stringify(updatedData), {
            expirationTtl: 60 * 60 * 24 * 30 // 30일
          });

          updatedCount++;
          console.log(`문서수 업데이트 완료: ${relKeyword} (블로그: ${blogCount})`);
        } else {
          const errorText = await openApiResponse.text();
          console.log(`OpenAPI 호출 실패: ${openApiResponse.status} - ${errorText}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`문서수 수집 오류 (${relKeyword}):`, error.message);
        errorCount++;
      }

      // API 호출 간격 조절 (너무 빠르게 호출하지 않도록)
      if (i < Math.min(keywordData.length, limit) - 1) {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms 대기
      }
    }

    const result = {
      success: true,
      keyword,
      totalFound: keywordData.length,
      processed: Math.min(keywordData.length, limit),
      updatedCount,
      errorCount,
      message: `문서수 업데이트 완료: ${updatedCount}개 업데이트${errorCount > 0 ? `, ${errorCount}개 오류` : ''}`,
      timestamp: now
    };

    console.log('문서수 업데이트 결과:', result);

    return new Response(JSON.stringify(result), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('문서수 업데이트 오류:', error);
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
