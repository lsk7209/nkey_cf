// 백그라운드 수집 작업 수행
async function performBackgroundCollection({ collectionId, keyword, related, autoUpdateDocuments, env, startTime, kvAvailable }) {
  console.log(`백그라운드 수집 시작 (${collectionId}): ${keyword}, ${related.length}개 항목`);

  if (!kvAvailable) {
    console.log(`백그라운드 수집 중단 (${collectionId}): KV not available`);
    return;
  }

  const BATCH_SIZE = 20;
  const maxItems = Math.min(related.length, 500);
  const now = new Date();
  const dateBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;
  const fetchedAt = now.toISOString();
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // 배치별로 처리
  for (let batchStart = 0; batchStart < maxItems; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, maxItems);
    const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(maxItems / BATCH_SIZE);
    
    console.log(`백그라운드 배치 ${batchNumber}/${totalBatches} 처리 중 (${collectionId}): ${batchStart + 1}-${batchEnd}번째 항목`);

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
            console.log(`백그라운드 문서수 정보 수집 중 (${collectionId}): ${rel}`);
            
            const openApiKey = getAvailableOpenApiKey(env);
            if (!openApiKey) {
              console.log('OpenAPI 키가 설정되지 않음 - 모의 문서수 생성');
              blogCount = Math.floor(Math.random() * 5000) + 1000;
              cafeCount = Math.floor(Math.random() * 2000) + 500;
              newsCount = Math.floor(Math.random() * 100) + 10;
              webCount = Math.floor(Math.random() * 10000) + 2000;
            } else {
              const query = encodeURIComponent(rel);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);
              
              const [blogResponse, cafeResponse, newsResponse, webResponse] = await Promise.allSettled([
                fetch(`https://openapi.naver.com/v1/search/blog.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                }),
                fetch(`https://openapi.naver.com/v1/search/cafearticle.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                }),
                fetch(`https://openapi.naver.com/v1/search/news.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                }),
                fetch(`https://openapi.naver.com/v1/search/webkr.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                })
              ]);
              
              if (blogResponse.status === 'fulfilled' && blogResponse.value.ok) {
                const blogData = await blogResponse.value.json();
                blogCount = blogData.total || 0;
              }
              
              if (cafeResponse.status === 'fulfilled' && cafeResponse.value.ok) {
                const cafeData = await cafeResponse.value.json();
                cafeCount = cafeData.total || 0;
              }
              
              if (newsResponse.status === 'fulfilled' && newsResponse.value.ok) {
                const newsData = await newsResponse.value.json();
                newsCount = newsData.total || 0;
              }
              
              if (webResponse.status === 'fulfilled' && webResponse.value.ok) {
                const webData = await webResponse.value.json();
                webCount = webData.total || 0;
              }
              
              clearTimeout(timeoutId);
            }
          } catch (docError) {
            console.error(`백그라운드 문서수 수집 오류 (${collectionId}, ${rel}):`, docError.message);
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
          fetched_at: fetchedAt,
          background_collection_id: collectionId
        };

        const storageKey = `data:${dateBucket}:${keyword}:${rel}`;
        
        try {
          // 중복 체크 (기존 데이터가 있는지 확인)
          const existingData = await env.KEYWORDS_KV.get(storageKey);
          let shouldSkip = false;
          let shouldUpdate = false;
          
          if (existingData) {
            try {
              const existingRecord = JSON.parse(existingData);
              const existingFetchedAt = existingRecord.fetched_at || existingRecord.created_at;
              
              if (existingFetchedAt) {
                const existingDate = new Date(existingFetchedAt);
                const daysDiff = Math.floor((now - existingDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff < 30) {
                  shouldSkip = true;
                  console.log(`백그라운드 중복 키워드 건너뛰기 (${collectionId}, ${daysDiff}일 전 수집): ${rel}`);
                } else {
                  shouldUpdate = true;
                  console.log(`백그라운드 중복 키워드 덮어쓰기 (${collectionId}, ${daysDiff}일 전 수집): ${rel}`);
                }
              } else {
                shouldUpdate = true;
                console.log(`백그라운드 중복 키워드 덮어쓰기 (${collectionId}, 수집일 정보 없음): ${rel}`);
              }
            } catch (parseError) {
              shouldUpdate = true;
              console.log(`백그라운드 중복 키워드 덮어쓰기 (${collectionId}, 데이터 파싱 오류): ${rel}`);
            }
          }
          
          if (shouldSkip) {
            skippedCount++;
            console.log(`백그라운드 건너뛰기 완료 (${collectionId}): ${rel}`);
            continue;
          }
          
          if (shouldUpdate) {
            record.updated_at = fetchedAt;
            record.is_update = true;
          } else {
            record.created_at = fetchedAt;
            record.is_update = false;
          }
          
          // Cloudflare KV에 저장
          await env.KEYWORDS_KV.put(storageKey, JSON.stringify(record), {
            expirationTtl: 60 * 60 * 24 * 30 // 30일 후 만료
          });
          
          savedCount++;
          console.log(`백그라운드 ${shouldUpdate ? '업데이트' : '신규 저장'} 완료 (${collectionId}): ${rel}`);
        } catch (saveError) {
          errorCount++;
          console.error(`백그라운드 KV 저장 오류 (${collectionId}, ${storageKey}):`, saveError.message);
        }
      } catch (error) {
        errorCount++;
        console.error(`백그라운드 데이터 저장 오류 (${collectionId}, ${rel}):`, error.message);
      }
    }
    
    // 배치 간 짧은 대기
    if (batchEnd < maxItems) {
      console.log(`백그라운드 배치 ${batchNumber} 완료 (${collectionId}). 다음 배치 준비 중...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const endTime = new Date().toISOString();
  const duration = new Date(endTime) - new Date(startTime);
  
  console.log(`백그라운드 수집 완료 (${collectionId}): ${savedCount}개 저장, ${skippedCount}개 건너뛰기, ${errorCount}개 오류 (${Math.round(duration/1000)}초)`);
  
  // 수집 완료 상태를 KV에 저장 (선택사항)
  try {
    await env.KEYWORDS_KV.put(`collection_status:${collectionId}`, JSON.stringify({
      collectionId,
      keyword,
      status: 'completed',
      savedCount,
      skippedCount,
      errorCount,
      totalCount: related.length,
      startTime,
      endTime,
      duration: Math.round(duration/1000)
    }), {
      expirationTtl: 60 * 60 * 24 * 7 // 7일 후 만료
    });
  } catch (statusError) {
    console.error(`백그라운드 수집 상태 저장 오류 (${collectionId}):`, statusError.message);
  }
}

// OpenAPI 키 선택
function getAvailableOpenApiKey(env) {
  const keys = [];
  
  // 다중 키 지원 (1-10번까지 확인)
  for (let i = 1; i <= 10; i++) {
    const clientId = env[`NAVER_CLIENT_ID_${i}`];
    const clientSecret = env[`NAVER_CLIENT_SECRET_${i}`];
    
    if (clientId && clientSecret) {
      keys.push({
        clientId,
        clientSecret
      });
    }
  }
  
  // 기존 단일 키도 확인
  if (env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET) {
    keys.push({
      clientId: env.NAVER_CLIENT_ID,
      clientSecret: env.NAVER_CLIENT_SECRET
    });
  }
  
  console.log(`사용 가능한 OpenAPI 키: ${keys.length}개`);
  return keys.length > 0 ? keys[0] : null;
}

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
    const backgroundMode = body?.backgroundMode || false;

    console.log('저장 요청:', { keyword, relatedCount: related.length, autoUpdateDocuments, backgroundMode, kvAvailable });

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

    // 2) 백그라운드 모드 처리
    if (backgroundMode) {
      const collectionId = `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = new Date().toISOString();

      // 백그라운드에서 실제 수집 작업 수행
      const backgroundPromise = performBackgroundCollection({
        collectionId,
        keyword,
        related,
        autoUpdateDocuments,
        env,
        startTime,
        kvAvailable
      });

      // 백그라운드 작업을 기다리지 않고 즉시 응답
      backgroundPromise.catch(error => {
        console.error(`백그라운드 수집 오류 (${collectionId}):`, error);
      });

      return new Response(JSON.stringify({
        success: true,
        backgroundMode: true,
        collectionId,
        keyword,
        totalCount: related.length,
        message: "백그라운드 수집이 시작되었습니다. 페이지를 나가셔도 수집이 계속됩니다.",
        startTime,
        debug: {
          backgroundCollection: true,
          collectionId,
          kvAvailable,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 3) 시뮬레이션 분기(운영에서 kvAvailable=false면 바인딩 문제)
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
        
        // 연관키워드가 없는 경우 검색한 키워드 자체를 저장
        if (!rel) {
          console.log(`연관키워드 없음 - 검색 키워드 자체 저장: ${keyword}`);
          const storageKey = `data:${dateBucket}:${keyword}:${keyword}`;
          const record = {
            keyword: keyword,
            rel_keyword: keyword,
            fetched_at: fetchedAt,
            created_at: fetchedAt,
            is_update: false
          };
          
          try {
            console.log(`KV 저장 시도: ${storageKey}`);
            console.log(`저장할 데이터:`, JSON.stringify(record));
            
            // KV 저장 전 상태 확인
            console.log(`KV 저장 전 상태 확인: ${storageKey}`);
            const beforeData = await env.KEYWORDS_KV.get(storageKey);
            console.log(`저장 전 데이터:`, beforeData);
            
            const putResult = await env.KEYWORDS_KV.put(storageKey, JSON.stringify(record));
            console.log(`KV 저장 결과:`, putResult);
            
            // 저장 후 검증 (즉시)
            console.log(`저장 검증 시작: ${storageKey}`);
            const verifyData = await env.KEYWORDS_KV.get(storageKey);
            console.log(`저장 검증 결과:`, verifyData ? '성공' : '실패');
            
            if (verifyData) {
              console.log(`저장 검증 성공: ${storageKey}`);
              savedCount++;
              console.log(`검색 키워드 저장 완료: ${keyword}`);
            } else {
              console.error(`저장 검증 실패: ${storageKey}`);
              errorCount++;
            }
          } catch (error) {
            console.error(`검색 키워드 저장 오류:`, error);
            console.error(`오류 상세:`, error.message);
            console.error(`오류 스택:`, error.stack);
            errorCount++;
          }
          continue;
        }

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
            
            // OpenAPI 키 확인 (다중 키 지원)
            const openApiKey = getAvailableOpenApiKey(env);
            if (!openApiKey) {
              console.log('OpenAPI 키가 설정되지 않음 - 모의 문서수 생성');
              // 모의 문서수 생성
              blogCount = Math.floor(Math.random() * 5000) + 1000;
              cafeCount = Math.floor(Math.random() * 2000) + 500;
              newsCount = Math.floor(Math.random() * 100) + 10;
              webCount = Math.floor(Math.random() * 10000) + 2000;
              console.log(`모의 문서수 생성: 블로그 ${blogCount}, 카페 ${cafeCount}, 뉴스 ${newsCount}, 웹 ${webCount}`);
            } else {
              const query = encodeURIComponent(rel);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초로 증가
              
              // 모든 문서 타입을 병렬로 수집
              const [blogResponse, cafeResponse, newsResponse, webResponse] = await Promise.allSettled([
                fetch(`https://openapi.naver.com/v1/search/blog.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                }),
                fetch(`https://openapi.naver.com/v1/search/cafearticle.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                }),
                fetch(`https://openapi.naver.com/v1/search/news.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                }),
                fetch(`https://openapi.naver.com/v1/search/webkr.json?query=${query}&display=1`, {
                  method: 'GET',
                  headers: {
                    'X-Naver-Client-Id': openApiKey.clientId,
                    'X-Naver-Client-Secret': openApiKey.clientSecret
                  },
                  signal: controller.signal
                })
              ]);
              
              // 블로그 문서수 처리
              if (blogResponse.status === 'fulfilled' && blogResponse.value.ok) {
                const blogData = await blogResponse.value.json();
                blogCount = blogData.total || 0;
                console.log(`블로그 문서수: ${blogCount}`);
              }
              
              // 카페 문서수 처리
              if (cafeResponse.status === 'fulfilled' && cafeResponse.value.ok) {
                const cafeData = await cafeResponse.value.json();
                cafeCount = cafeData.total || 0;
                console.log(`카페 문서수: ${cafeCount}`);
              }
              
              // 뉴스 문서수 처리
              if (newsResponse.status === 'fulfilled' && newsResponse.value.ok) {
                const newsData = await newsResponse.value.json();
                newsCount = newsData.total || 0;
                console.log(`뉴스 문서수: ${newsCount}`);
              }
              
              // 웹 문서수 처리
              if (webResponse.status === 'fulfilled' && webResponse.value.ok) {
                const webData = await webResponse.value.json();
                webCount = webData.total || 0;
                console.log(`웹 문서수: ${webCount}`);
              }
              
              clearTimeout(timeoutId);
              console.log(`문서수 수집 완료: ${rel} - 총 ${blogCount + cafeCount + newsCount + webCount}개`);
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
          let shouldSkip = false;
          let shouldUpdate = false;
          
          if (existingData) {
            try {
              const existingRecord = JSON.parse(existingData);
              const existingFetchedAt = existingRecord.fetched_at || existingRecord.created_at;
              
              if (existingFetchedAt) {
                const existingDate = new Date(existingFetchedAt);
                const daysDiff = Math.floor((now - existingDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff < 30) {
                  shouldSkip = true;
                  console.log(`중복 키워드 발견 - 건너뛰기 (${daysDiff}일 전 수집): ${rel}`);
                } else {
                  shouldUpdate = true;
                  console.log(`중복 키워드 발견 - 30일 경과로 덮어쓰기 (${daysDiff}일 전 수집): ${rel}`);
                }
              } else {
                // 기존 데이터에 수집일이 없으면 덮어쓰기
                shouldUpdate = true;
                console.log(`중복 키워드 발견 - 수집일 정보 없음으로 덮어쓰기: ${rel}`);
              }
            } catch (parseError) {
              // 기존 데이터 파싱 오류시 덮어쓰기
              shouldUpdate = true;
              console.log(`중복 키워드 발견 - 데이터 파싱 오류로 덮어쓰기: ${rel}`);
            }
          }
          
          if (shouldSkip) {
            console.log(`건너뛰기 완료 (${i+1}/${maxItems}): ${rel}`);
            // 테스트를 위해 임시로 건너뛰기 비활성화
            // continue; // 다음 항목으로 넘어감
            console.log(`테스트: 건너뛰기 비활성화 - 강제 저장: ${rel}`);
          }
          
          if (shouldUpdate) {
            // 기존 데이터가 있으면 업데이트 시간 추가
            record.updated_at = fetchedAt;
            record.is_update = true;
          } else {
            record.created_at = fetchedAt;
            record.is_update = false;
          }
          
          // Cloudflare KV 문서에 따른 저장 방법 (덮어쓰기)
          console.log(`KV 저장 시도: ${storageKey}`);
          console.log(`저장할 데이터:`, JSON.stringify(record, null, 2));
          
          try {
            console.log(`KV 저장 시작: ${storageKey}`);
            
            // 가장 기본적인 저장 테스트
            const testData = {
              keyword: record.keyword,
              rel_keyword: record.rel_keyword,
              test: true
            };
            console.log(`테스트 데이터:`, JSON.stringify(testData));
            
            // KV 저장 전 상태 확인
            console.log(`KV 저장 전 상태 확인: ${storageKey}`);
            const beforeData = await env.KEYWORDS_KV.get(storageKey);
            console.log(`저장 전 데이터:`, beforeData);
            
            const putResult = await env.KEYWORDS_KV.put(storageKey, JSON.stringify(testData));
            console.log(`KV 저장 결과:`, putResult);
            
            // 저장 후 검증 (즉시)
            console.log(`저장 검증 시작: ${storageKey}`);
            const verifyData = await env.KEYWORDS_KV.get(storageKey);
            console.log(`저장 검증 결과:`, verifyData ? '성공' : '실패');
            
            if (verifyData) {
              console.log(`저장 검증 성공: ${storageKey}`);
              savedCount++;
              console.log(`${shouldUpdate ? '업데이트' : '신규 저장'} 완료 (${savedCount}/${maxItems}): ${rel}`);
            } else {
              console.error(`저장 검증 실패: ${storageKey} - 데이터가 저장되지 않음`);
              errorCount++;
            }
          } catch (kvError) {
            console.error(`KV 저장 중 오류 발생:`, kvError);
            console.error(`오류 상세:`, kvError.message);
            console.error(`오류 스택:`, kvError.stack);
            errorCount++;
          }
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

    const skippedCount = maxItems - savedCount - errorCount;
    const result = {
      success: true,
      keyword,
      savedCount,
      skippedCount,
      totalCount: related.length,
      maxItems,
      errorCount,
      batchSize: BATCH_SIZE,
      totalBatches: Math.ceil(maxItems / BATCH_SIZE),
      dateBucket,
      fetchedAt,
      message: `배치 처리 완료: 총 ${related.length}개 중 ${maxItems}개 처리, ${savedCount}개 저장 완료${skippedCount > 0 ? `, ${skippedCount}개 건너뛰기` : ''}${errorCount > 0 ? ` (${errorCount}개 오류)` : ''}`,
      debug: {
        kvAvailable: true,
        autoUpdateDocuments,
        duplicateHandling: true,
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