// Cloudflare Functions - 백그라운드 수집 작업 시작
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const keyword = body?.keyword || "";
    const related = Array.isArray(body?.related) ? body.related : [];
    const autoUpdateDocuments = body?.autoUpdateDocuments || false;

    console.log(`백그라운드 수집 시작: ${keyword}, 연관키워드 ${related.length}개`);

    if (!keyword || related.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "키워드와 연관키워드가 필요합니다"
      }), { 
        status: 400,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 작업 ID 생성 (타임스탬프 + 랜덤)
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const dateBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;

    // 작업 상태를 KV에 저장
    const jobStatus = {
      jobId,
      keyword,
      totalItems: related.length,
      processedItems: 0,
      savedItems: 0,
      errorItems: 0,
      status: 'processing', // processing, completed, failed
      startedAt: now.toISOString(),
      completedAt: null,
      message: '백그라운드 수집 작업이 시작되었습니다.',
      autoUpdateDocuments
    };

    // 작업 상태 저장
    await env.KEYWORDS_KV.put(`job:${jobId}`, JSON.stringify(jobStatus), {
      expirationTtl: 60 * 60 * 24 * 7 // 7일 후 만료
    });

    // 백그라운드 작업 시작 (비동기)
    processCollectionJob(env, jobId, keyword, related, dateBucket, autoUpdateDocuments)
      .catch(error => {
        console.error(`백그라운드 작업 오류 (${jobId}):`, error);
        // 오류 상태 업데이트
        updateJobStatus(env, jobId, {
          status: 'failed',
          message: `작업 실패: ${error.message}`,
          completedAt: new Date().toISOString()
        });
      });

    return new Response(JSON.stringify({
      success: true,
      jobId,
      message: '백그라운드 수집 작업이 시작되었습니다. 페이지를 나가셔도 작업이 계속됩니다.',
      statusUrl: `/api/job-status?jobId=${jobId}`
    }), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('백그라운드 수집 시작 오류:', error);
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

// 백그라운드 작업 처리 함수
async function processCollectionJob(env, jobId, keyword, related, dateBucket, autoUpdateDocuments) {
  const BATCH_SIZE = 20;
  const maxItems = Math.min(related.length, 500);
  let savedCount = 0;
  let errorCount = 0;

  console.log(`백그라운드 작업 시작 (${jobId}): 총 ${related.length}개 중 최대 ${maxItems}개 처리`);

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
          fetched_at: new Date().toISOString(),
          job_id: jobId
        };

        const storageKey = `data:${dateBucket}:${keyword}:${rel}`;
        
        // 중복 체크
        const existingData = await env.KEYWORDS_KV.get(storageKey);
        const isUpdate = !!existingData;
        
        if (isUpdate) {
          record.updated_at = new Date().toISOString();
          record.is_update = true;
        } else {
          record.created_at = new Date().toISOString();
          record.is_update = false;
        }
        
        // KV에 저장
        await env.KEYWORDS_KV.put(storageKey, JSON.stringify(record), {
          expirationTtl: 60 * 60 * 24 * 30 // 30일
        });
        
        savedCount++;
        console.log(`${isUpdate ? '업데이트' : '신규 저장'} 완료 (${savedCount}/${maxItems}): ${rel}`);
        
      } catch (error) {
        errorCount++;
        console.error(`데이터 저장 오류 (${rel}):`, error.message);
      }
    }

    // 작업 상태 업데이트
    await updateJobStatus(env, jobId, {
      processedItems: batchEnd,
      savedItems: savedCount,
      errorItems: errorCount,
      message: `배치 ${batchNumber}/${totalBatches} 완료 (${savedCount}/${maxItems} 저장됨)`
    });

    // 배치 간 대기
    if (batchEnd < maxItems) {
      console.log(`배치 ${batchNumber} 완료. 다음 배치 준비 중...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 작업 완료
  await updateJobStatus(env, jobId, {
    status: 'completed',
    message: `수집 완료: 총 ${savedCount}개 저장됨${errorCount > 0 ? `, ${errorCount}개 오류` : ''}`,
    completedAt: new Date().toISOString()
  });

  console.log(`백그라운드 작업 완료 (${jobId}): ${savedCount}개 저장됨`);
}

// 작업 상태 업데이트 함수
async function updateJobStatus(env, jobId, updates) {
  try {
    const existingStatus = await env.KEYWORDS_KV.get(`job:${jobId}`);
    if (existingStatus) {
      const status = JSON.parse(existingStatus);
      const updatedStatus = { ...status, ...updates };
      await env.KEYWORDS_KV.put(`job:${jobId}`, JSON.stringify(updatedStatus), {
        expirationTtl: 60 * 60 * 24 * 7 // 7일
      });
    }
  } catch (error) {
    console.error(`작업 상태 업데이트 오류 (${jobId}):`, error);
  }
}
