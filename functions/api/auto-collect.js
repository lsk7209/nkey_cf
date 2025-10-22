// Cloudflare Functions - 자동수집 시스템
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action || ""; // start, stop, status
    const maxKeywords = Math.min(body?.maxKeywords || 10, 50); // 최대 50개

    console.log(`자동수집 요청: ${action}, 최대 키워드: ${maxKeywords}개`);

    if (!action) {
      return new Response(JSON.stringify({
        success: false,
        message: "action이 필요합니다 (start, stop, status)"
      }), { 
        status: 400,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

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

    if (action === 'start') {
      return await startAutoCollection(env, maxKeywords);
    } else if (action === 'stop') {
      return await stopAutoCollection(env);
    } else if (action === 'status') {
      return await getAutoCollectionStatus(env);
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "잘못된 action입니다"
      }), { 
        status: 400,
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

  } catch (error) {
    console.error('자동수집 오류:', error);
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

// 자동수집 시작
async function startAutoCollection(env, maxKeywords) {
  try {
    // 기존 자동수집 상태 확인
    const existingStatus = await env.KEYWORDS_KV.get('auto_collection_status');
    if (existingStatus) {
      const status = JSON.parse(existingStatus);
      if (status.isRunning) {
        return new Response(JSON.stringify({
          success: false,
          message: "이미 자동수집이 실행 중입니다"
        }), {
          headers: { 
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    // 시드키워드 목록 조회 (사용되지 않은 것들)
    const seedKeywords = await getUnusedSeedKeywords(env);
    
    if (seedKeywords.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "사용 가능한 시드키워드가 없습니다"
      }), {
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 자동수집 상태 설정
    const autoCollectionStatus = {
      isRunning: true,
      maxKeywords,
      currentKeywordIndex: 0,
      totalKeywords: Math.min(seedKeywords.length, maxKeywords),
      processedKeywords: 0,
      collectedKeywords: 0,
      startedAt: new Date().toISOString(),
      seedKeywords: seedKeywords.slice(0, maxKeywords),
      message: '자동수집이 시작되었습니다'
    };

    await env.KEYWORDS_KV.put('auto_collection_status', JSON.stringify(autoCollectionStatus), {
      expirationTtl: 60 * 60 * 24 * 7 // 7일
    });

    // 백그라운드 자동수집 시작
    processAutoCollection(env, autoCollectionStatus)
      .catch(error => {
        console.error('자동수집 백그라운드 작업 오류:', error);
        updateAutoCollectionStatus(env, {
          isRunning: false,
          message: `자동수집 오류: ${error.message}`,
          completedAt: new Date().toISOString()
        });
      });

    return new Response(JSON.stringify({
      success: true,
      message: `자동수집이 시작되었습니다. ${autoCollectionStatus.totalKeywords}개 키워드를 처리합니다.`,
      status: autoCollectionStatus
    }), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('자동수집 시작 오류:', error);
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

// 자동수집 중지
async function stopAutoCollection(env) {
  try {
    await updateAutoCollectionStatus(env, {
      isRunning: false,
      message: '자동수집이 중지되었습니다',
      completedAt: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      message: '자동수집이 중지되었습니다'
    }), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('자동수집 중지 오류:', error);
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

// 자동수집 상태 조회
async function getAutoCollectionStatus(env) {
  try {
    const statusData = await env.KEYWORDS_KV.get('auto_collection_status');
    
    if (!statusData) {
      return new Response(JSON.stringify({
        success: true,
        isRunning: false,
        message: '자동수집이 실행되지 않았습니다'
      }), {
        headers: { 
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const status = JSON.parse(statusData);
    return new Response(JSON.stringify({
      success: true,
      ...status
    }), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('자동수집 상태 조회 오류:', error);
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

// 사용되지 않은 시드키워드 조회
async function getUnusedSeedKeywords(env) {
  try {
    // 모든 데이터 키 조회
    const list = await env.KEYWORDS_KV.list({ prefix: "data:", limit: 1000 });
    const keys = list?.keys || [];
    
    // 사용된 시드키워드 추출
    const usedKeywords = new Set();
    for (const key of keys) {
      const parts = key.name.split(':');
      if (parts.length >= 3) {
        usedKeywords.add(parts[2]); // 시드키워드 부분
      }
    }

    // 기본 시드키워드 목록 (실제로는 더 많은 키워드가 있을 수 있음)
    const allSeedKeywords = [
      '홍대갈만한곳', '강남맛집', '신촌카페', '이태원클럽', '명동쇼핑',
      '건대맛집', '성수카페', '압구정쇼핑', '청담동맛집', '한남동카페',
      '성신여대맛집', '혜화카페', '대학로공연', '인사동전통', '종로쇼핑',
      '동대문쇼핑', '남대문시장', '광화문맛집', '서울역맛집', '용산쇼핑',
      '여의도맛집', '여의도카페', '마포맛집', '마포카페', '상수동맛집',
      '상수동카페', '합정맛집', '합정카페', '홍대맛집', '홍대카페',
      '홍대클럽', '홍대쇼핑', '신촌맛집', '신촌쇼핑', '이대맛집',
      '이대쇼핑', '서강대맛집', '연세대맛집', '고려대맛집', '성균관대맛집'
    ];

    // 사용되지 않은 키워드만 반환
    const unusedKeywords = allSeedKeywords.filter(keyword => !usedKeywords.has(keyword));
    
    console.log(`사용된 키워드: ${usedKeywords.size}개, 사용 가능한 키워드: ${unusedKeywords.length}개`);
    
    return unusedKeywords;

  } catch (error) {
    console.error('시드키워드 조회 오류:', error);
    return [];
  }
}

// 백그라운드 자동수집 처리
async function processAutoCollection(env, status) {
  console.log('백그라운드 자동수집 시작:', status);

  for (let i = 0; i < status.seedKeywords.length; i++) {
    const seedKeyword = status.seedKeywords[i];
    
    try {
      console.log(`자동수집 처리 중 (${i + 1}/${status.seedKeywords.length}): ${seedKeyword}`);
      
      // 네이버 검색광고 API 호출
      const relatedKeywords = await fetchRelatedKeywords(env, seedKeyword);
      
      if (relatedKeywords.length > 0) {
        // 연관키워드 저장
        await saveRelatedKeywords(env, seedKeyword, relatedKeywords);
        
        // 시드키워드 사용 표시
        await markSeedKeywordAsUsed(env, seedKeyword);
        
        status.collectedKeywords += relatedKeywords.length;
        console.log(`${seedKeyword} 처리 완료: ${relatedKeywords.length}개 연관키워드 수집`);
      }
      
      status.processedKeywords++;
      status.currentKeywordIndex = i + 1;
      
      // 상태 업데이트
      await updateAutoCollectionStatus(env, {
        ...status,
        message: `${seedKeyword} 처리 완료 (${i + 1}/${status.seedKeywords.length})`
      });
      
      // 키워드 간 대기 (API 호출 제한 방지)
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      
    } catch (error) {
      console.error(`자동수집 오류 (${seedKeyword}):`, error);
      status.processedKeywords++;
      status.currentKeywordIndex = i + 1;
      
      await updateAutoCollectionStatus(env, {
        ...status,
        message: `${seedKeyword} 처리 오류: ${error.message}`
      });
    }
  }

  // 자동수집 완료
  await updateAutoCollectionStatus(env, {
    isRunning: false,
    message: `자동수집 완료: ${status.processedKeywords}개 키워드 처리, ${status.collectedKeywords}개 연관키워드 수집`,
    completedAt: new Date().toISOString()
  });

  console.log('자동수집 완료:', status);
}

// 연관키워드 조회
async function fetchRelatedKeywords(env, seedKeyword) {
  try {
    const response = await fetch('https://api.naver.com/keywordstool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET
      },
      body: JSON.stringify({
        hintKeywords: [seedKeyword],
        showDetail: '1'
      })
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.keywordList || [];

  } catch (error) {
    console.error(`연관키워드 조회 오류 (${seedKeyword}):`, error);
    return [];
  }
}

// 연관키워드 저장 (문서수 자동 수집 포함)
async function saveRelatedKeywords(env, seedKeyword, relatedKeywords) {
  const now = new Date();
  const dateBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;
  const fetchedAt = now.toISOString();

  for (const item of relatedKeywords.slice(0, 20)) { // 최대 20개만 저장
    const rel = item?.rel_keyword ?? "";
    if (!rel) continue;

    try {
      // 문서수 자동 수집
      let blogCount = 0;
      let cafeCount = 0;
      let newsCount = 0;
      let webCount = 0;
      let totalDocs = 0;
      let potentialScore = 0;

      try {
        console.log(`자동수집 - 문서수 수집 중: ${rel}`);
        
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
          console.log(`자동수집 - 블로그 문서수: ${blogCount}`);
        } else {
          console.log(`자동수집 - OpenAPI 호출 실패: ${openApiResponse.status}`);
        }
      } catch (docError) {
        console.error(`자동수집 - 문서수 수집 오류 (${rel}):`, docError.message);
      }

      // 총 문서수 및 잠재력 점수 계산
      totalDocs = blogCount + cafeCount + newsCount + webCount;
      if (totalDocs > 0) {
        potentialScore = ((item.pc_search + item.mobile_search) / totalDocs) * 100;
      }

      const record = {
        keyword: seedKeyword,
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
        seed_usage: 'auto_collected',
        raw_json: JSON.stringify(item),
        fetched_at: fetchedAt,
        created_at: fetchedAt,
        is_update: false,
        doc_updated_at: fetchedAt // 문서수 수집 시간 기록
      };

      const storageKey = `data:${dateBucket}:${seedKeyword}:${rel}`;
      await env.KEYWORDS_KV.put(storageKey, JSON.stringify(record), {
        expirationTtl: 60 * 60 * 24 * 30 // 30일
      });

      console.log(`자동수집 - 저장 완료: ${rel} (블로그: ${blogCount}, 잠재력: ${potentialScore.toFixed(1)})`);

    } catch (error) {
      console.error(`자동수집 - 연관키워드 저장 오류 (${rel}):`, error);
    }

    // 키워드 간 대기 (API 호출 제한 방지)
    await new Promise(resolve => setTimeout(resolve, 300)); // 300ms 대기
  }
}

// 시드키워드 사용 표시
async function markSeedKeywordAsUsed(env, seedKeyword) {
  try {
    await env.KEYWORDS_KV.put(`used_seed:${seedKeyword}`, 'true', {
      expirationTtl: 60 * 60 * 24 * 365 // 1년
    });
  } catch (error) {
    console.error(`시드키워드 사용 표시 오류 (${seedKeyword}):`, error);
  }
}

// 자동수집 상태 업데이트
async function updateAutoCollectionStatus(env, updates) {
  try {
    const existingStatus = await env.KEYWORDS_KV.get('auto_collection_status');
    if (existingStatus) {
      const status = JSON.parse(existingStatus);
      const updatedStatus = { ...status, ...updates };
      await env.KEYWORDS_KV.put('auto_collection_status', JSON.stringify(updatedStatus), {
        expirationTtl: 60 * 60 * 24 * 7 // 7일
      });
    }
  } catch (error) {
    console.error('자동수집 상태 업데이트 오류:', error);
  }
}
