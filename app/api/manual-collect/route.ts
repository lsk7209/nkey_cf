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

    // 키워드 수가 많을 경우 배치 처리로 최적화
    const keywordDetails = []
    const batchSize = 100; // 한 번에 처리할 키워드 수
    const totalBatches = Math.ceil(relatedKeywords.length / batchSize);
    
    console.log(`총 ${relatedKeywords.length}개 키워드를 ${totalBatches}개 배치로 처리합니다.`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, relatedKeywords.length);
      const batchKeywords = relatedKeywords.slice(startIndex, endIndex);
      
      console.log(`배치 ${batchIndex + 1}/${totalBatches} 처리 중: ${batchKeywords.length}개 키워드`);
      
      // 배치 내에서 병렬 처리 (최대 20개씩)
      const parallelSize = 20;
      for (let i = 0; i < batchKeywords.length; i += parallelSize) {
        const parallelBatch = batchKeywords.slice(i, i + parallelSize);
        
        const batchPromises = parallelBatch.map(async (keyword) => {
          try {
            const details = await naverAPI.getKeywordStats(keyword)
            if (details) {
              // 문서수 정보 수집
              try {
                const documentCounts = await documentAPI.getDocumentCounts(keyword)
                return {
                  ...details,
                  blog_count: documentCounts.blog,
                  news_count: documentCounts.news,
                  webkr_count: documentCounts.webkr,
                  cafe_count: documentCounts.cafe
                }
              } catch (docError) {
                console.error(`키워드 "${keyword}" 문서수 수집 실패:`, docError)
                return details
              }
            }
            return null
          } catch (error) {
            console.error(`키워드 "${keyword}" 상세 정보 수집 실패:`, error)
            return null
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        const validResults = batchResults.filter(result => result !== null)
        keywordDetails.push(...validResults)
        
        // 배치 간 대기
        if (i + parallelSize < batchKeywords.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log(`배치 ${batchIndex + 1} 완료: ${keywordDetails.length}개 키워드 수집됨`)
      
      // 배치 간 대기 (API 부하 분산)
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

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
