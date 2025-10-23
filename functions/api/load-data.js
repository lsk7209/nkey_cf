// Cloudflare Functions - 데이터 불러오기 (개선된 버전)
export async function onRequestGet(context) {
  const { env } = context;
  const kvAvailable = !!env.KEYWORDS_KV;

  try {
    console.log('데이터 불러오기 요청 시작');
    
    // 기본 응답 구조
    const defaultResponse = {
      total: 0,
      items: [],
      page: 1,
      pageSize: 50,
      totalPages: 0,
      debug: {
        kvAvailable,
        timestamp: new Date().toISOString()
      }
    };

    // KV 바인딩 상태 상세 확인
    console.log('KV 바인딩 상태:', {
      kvAvailable,
      envKeys: Object.keys(env),
      hasKeywordsKv: !!env.KEYWORDS_KV,
      kvType: typeof env.KEYWORDS_KV
    });

    // KV 스토리지가 없으면 모의 데이터 반환 (개발 환경용)
    if (!kvAvailable) {
      console.log('KEYWORDS_KV가 설정되지 않음 - 모의 데이터 반환');
      
      // 모의 데이터 생성
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        date_bucket: '2024-01-15',
        keyword: `테스트키워드${i + 1}`,
        rel_keyword: `테스트키워드${i + 1}`,
        pc_search: Math.floor(Math.random() * 10000) + 1000,
        mobile_search: Math.floor(Math.random() * 20000) + 5000,
        total_search: 0,
        cafe_count: Math.floor(Math.random() * 1000) + 100,
        blog_count: Math.floor(Math.random() * 2000) + 500,
        web_count: Math.floor(Math.random() * 5000) + 1000,
        news_count: Math.floor(Math.random() * 100) + 10,
        total_docs: 0,
        potential_score: 0,
        ctr_pc: Math.random() * 5 + 1,
        ctr_mo: Math.random() * 5 + 2,
        ad_count: Math.floor(Math.random() * 50) + 5,
        comp_idx: ['높음', '중간', '낮음'][Math.floor(Math.random() * 3)],
        seed_usage: 'N/A',
        fetched_at: new Date().toISOString(),
        source: 'mock'
      }));

      // 계산된 값들 설정
      mockData.forEach(item => {
        item.total_search = item.pc_search + item.mobile_search;
        item.total_docs = item.cafe_count + item.blog_count + item.web_count + item.news_count;
        item.potential_score = item.total_docs > 0 ? ((item.pc_search + item.mobile_search) / item.total_docs) * 100 : 0;
      });

      const total = mockData.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = mockData.slice(startIndex, endIndex);

      return new Response(JSON.stringify({
        total,
        items: paginatedData,
        page,
        pageSize,
        totalPages,
        debug: {
          kvAvailable: false,
          reason: "KEYWORDS_KV not bound - using mock data",
          mockDataCount: mockData.length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log('KV 바인딩 확인됨:', {
      exists: !!env.KEYWORDS_KV,
      type: typeof env.KEYWORDS_KV,
      methods: env.KEYWORDS_KV ? Object.getOwnPropertyNames(Object.getPrototypeOf(env.KEYWORDS_KV)) : []
    });

    console.log('KV 스토리지 사용 가능 - 데이터 조회 시작');
    
    // 파라미터 처리
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const sortBy = url.searchParams.get('sortBy') || 'cafe_count';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    console.log('파라미터:', { page, pageSize, sortBy, sortOrder });

    // KV에서 키 목록 조회
    try {
      console.log('키 목록 조회 시작...');
      console.log('KV 바인딩 상태:', {
        exists: !!env.KEYWORDS_KV,
        type: typeof env.KEYWORDS_KV,
        methods: env.KEYWORDS_KV ? Object.getOwnPropertyNames(Object.getPrototypeOf(env.KEYWORDS_KV)) : []
      });
      
             const result = await env.KEYWORDS_KV.list({
               prefix: 'data:',
               limit: 1000 // Cloudflare KV 최대 제한
             });
      const keys = result.keys || [];
      console.log('총 키 개수:', keys.length);
      console.log('조회된 키들:', keys.map(k => k.name));
      
      // 대용량 배치 처리로 성능 극대화 (최대 1000개)
      const maxKeys = Math.min(keys.length, 1000);
      const allData = [];
      const BATCH_SIZE = 25; // 25개씩 대용량 배치 처리
      
      console.log(`총 ${maxKeys}개 키를 ${BATCH_SIZE}개씩 대용량 배치 처리 시작`);
      
      // 모든 키를 한 번에 처리 (최대 성능)
      const allPromises = keys.slice(0, maxKeys).map(async (key) => {
        try {
          const data = await env.KEYWORDS_KV.get(key.name);
          if (data) {
            const record = JSON.parse(data);
            return {
              id: key.name,
              ...record
            };
          }
          return null;
        } catch (error) {
          console.error(`데이터 로드 오류 (${key.name}):`, error);
          return null;
        }
      });
      
      // 모든 데이터를 한 번에 병렬 처리
      console.log('모든 키워드 데이터 병렬 로딩 시작...');
      const allResults = await Promise.all(allPromises);
      const validResults = allResults.filter(result => result !== null);
      allData.push(...validResults);
      
      console.log(`전체 로딩 완료: ${validResults.length}개 데이터 로드됨`);

      // 복합 정렬 처리 (카페문서수 오름차순 + 총검색량 내림차순)
      console.log(`정렬 적용: ${sortBy} ${sortOrder}`);
      allData.sort((a, b) => {
        // 1순위: 카페문서수 오름차순
        let aCafeCount = a.cafe_count || 0;
        let bCafeCount = b.cafe_count || 0;
        
        if (aCafeCount !== bCafeCount) {
          return aCafeCount - bCafeCount; // 오름차순
        }
        
        // 2순위: 총검색량 내림차순
        let aTotalSearch = (a.pc_search || 0) + (a.mobile_search || 0);
        let bTotalSearch = (b.pc_search || 0) + (b.mobile_search || 0);
        
        return bTotalSearch - aTotalSearch; // 내림차순
      });

      // 페이지네이션
      const total = allData.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = allData.slice(startIndex, endIndex);

      console.log('최종 결과:', { total, page, pageSize, totalPages, itemsCount: paginatedData.length });

      return new Response(JSON.stringify({
        total,
        items: paginatedData,
        page,
        pageSize,
        totalPages,
        debug: {
          kvAvailable: true,
          keysFound: keys.length,
          dataLoaded: allData.length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } catch (listError) {
      console.error('키 목록 조회 오류:', listError);
      return new Response(JSON.stringify({ 
        ...defaultResponse,
        error: '키 목록 조회 실패',
        debug: {
          ...defaultResponse.debug,
          listError: listError.message
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    console.error('데이터 불러오기 오류:', error);
    return new Response(JSON.stringify({ 
      error: '데이터 불러오기 실패',
      details: error.message,
      debug: {
        kvAvailable: !!env.KEYWORDS_KV,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}