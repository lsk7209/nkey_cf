import { NextRequest, NextResponse } from 'next/server'
import { NaverKeywordAPI } from '@/lib/naver-api'
import { NaverDocumentAPI } from '@/lib/naver-document-api'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seedKeyword } = body

    if (!seedKeyword || typeof seedKeyword !== 'string') {
      return NextResponse.json(
        { message: '시드키워드가 필요합니다.' },
        { status: 400 }
      )
    }

    // 네이버 API 인스턴스 생성
    const naverAPI = new NaverKeywordAPI()
    const documentAPI = new NaverDocumentAPI()

    // 시드키워드로 연관키워드 수집
    const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword)
    
    if (relatedKeywords.length === 0) {
      return NextResponse.json(
        { 
          message: '연관키워드를 찾을 수 없습니다.',
          keywords: []
        },
        { status: 200 }
      )
    }

    // 🚀 고성능 병렬 처리: 다중 API 키 활용 + 메모리 최적화
    const startTime = Date.now();
    console.log(`🚀 고성능 병렬 처리 시작: ${relatedKeywords.length}개 키워드 (${new Date().toISOString()})`);
    
    // 메모리 효율적인 스트리밍 처리
    const batchSize = 500; // 메모리 효율을 위해 500개씩 처리
    const totalBatches = Math.ceil(relatedKeywords.length / batchSize);
    const allKeywordDetails: any[] = [];
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, relatedKeywords.length);
      const batchKeywords = relatedKeywords.slice(startIndex, endIndex);
      
      console.log(`📦 배치 ${batchIndex + 1}/${totalBatches} 처리 중: ${batchKeywords.length}개 키워드`);
      
      // 1단계: 키워드 통계 수집 (병렬 처리)
      console.log(`📊 배치 ${batchIndex + 1} - 1단계: 키워드 통계 수집 중...`);
      const keywordStats = await naverAPI.getBatchKeywordStats(batchKeywords, 10);
      console.log(`✅ 배치 ${batchIndex + 1} - 1단계 완료: ${keywordStats.length}개 키워드 통계 수집됨`);
      
      // 2단계: 문서수 수집 (병렬 처리)
      console.log(`📄 배치 ${batchIndex + 1} - 2단계: 문서수 수집 중...`);
      const keywordsForDocs = keywordStats.map(stat => stat.keyword);
      const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, 5);
      console.log(`✅ 배치 ${batchIndex + 1} - 2단계 완료: ${documentCountsMap.size}개 키워드 문서수 수집됨`);
      
      // 3단계: 데이터 통합
      console.log(`🔗 배치 ${batchIndex + 1} - 3단계: 데이터 통합 중...`);
      const batchKeywordDetails = keywordStats.map(stat => {
        const docCounts = documentCountsMap.get(stat.keyword) || { blog: 0, news: 0, webkr: 0, cafe: 0 };
        return {
          ...stat,
          blog_count: docCounts.blog,
          news_count: docCounts.news,
          webkr_count: docCounts.webkr,
          cafe_count: docCounts.cafe
        };
      });
      
      allKeywordDetails.push(...batchKeywordDetails);
      console.log(`✅ 배치 ${batchIndex + 1} 완료: ${batchKeywordDetails.length}개 키워드 처리됨 (총 ${allKeywordDetails.length}개)`);
      
      // 메모리 정리 (가비지 컬렉션 유도)
      if (batchIndex % 5 === 0) {
        if (global.gc) {
          global.gc();
        }
      }
    }
    
    const keywordDetails = allKeywordDetails;
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    const avgTimePerKeyword = totalTime / keywordDetails.length;
    
    console.log(`🎉 고성능 병렬 처리 완료: ${keywordDetails.length}개 키워드 최종 수집됨`);
    console.log(`⏱️ 총 처리 시간: ${totalTime.toFixed(2)}초 (키워드당 평균: ${avgTimePerKeyword.toFixed(3)}초)`);
    console.log(`📊 처리 속도: ${(keywordDetails.length / totalTime).toFixed(2)}개/초`);

    // 수집된 키워드 데이터를 데이터베이스에 저장
    if (keywordDetails.length > 0) {
      try {
        const insertData = keywordDetails.map(detail => ({
          seed_keyword: seedKeyword,
          keyword: detail.keyword,
          pc_search: detail.pc_search,
          mobile_search: detail.mobile_search,
          total_search: detail.total_search,
          monthly_click_pc: detail.monthly_click_pc,
          monthly_click_mobile: detail.monthly_click_mobile,
          ctr_pc: detail.ctr_pc,
          ctr_mobile: detail.ctr_mobile,
          ad_count: detail.ad_count,
          comp_idx: detail.comp_idx,
          blog_count: detail.blog_count || 0,
          news_count: detail.news_count || 0,
          webkr_count: detail.webkr_count || 0,
          cafe_count: detail.cafe_count || 0,
          raw_json: detail.raw_json,
          fetched_at: detail.fetched_at
        }))

        const { error: insertError } = await supabase
          .from('manual_collection_results')
          .insert(insertData)

        if (insertError) {
          console.error('데이터베이스 저장 오류:', insertError)
          // 저장 실패해도 수집 결과는 반환
        } else {
          console.log(`${keywordDetails.length}개 키워드 데이터 저장 완료`)
        }
      } catch (dbError) {
        console.error('데이터베이스 저장 중 오류:', dbError)
        // 저장 실패해도 수집 결과는 반환
      }
    }

    return NextResponse.json({
      message: '수집 완료',
      seedKeyword,
      keywords: keywordDetails,
      savedCount: keywordDetails.length
    })

  } catch (error: any) {
    console.error('수동수집 오류:', error)
    
    // 네이버 API 관련 에러 처리
    if (error.message?.includes('429')) {
      return NextResponse.json(
        { 
          message: 'API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.',
          error: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return NextResponse.json(
        { 
          message: '네이버 API 인증에 실패했습니다. API 키를 확인해주세요.',
          error: 'AUTHENTICATION_FAILED'
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        message: '키워드 수집에 실패했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
