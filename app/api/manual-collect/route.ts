import { NextRequest, NextResponse } from 'next/server'
import { NaverKeywordAPI } from '@/lib/naver-api'
import { NaverDocumentAPI } from '@/lib/naver-document-api'
import { supabase } from '@/lib/supabase'

// 중복 키워드 필터링 함수
async function filterDuplicateKeywords(keywordDetails: any[]) {
  if (keywordDetails.length === 0) return []
  
  const keywords = keywordDetails.map(detail => detail.keyword)
  
  // 30일 이내에 존재하는 키워드들 조회
  const { data: existingKeywords, error } = await supabase
    .from('manual_collection_results')
    .select('keyword')
    .in('keyword', keywords)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30일 전
  
  if (error) {
    console.error('중복 키워드 조회 오류:', error)
    return keywordDetails // 오류 시 모든 키워드 반환
  }
  
  const existingKeywordSet = new Set(existingKeywords?.map((item: any) => item.keyword) || [])
  
  // 중복되지 않은 키워드만 필터링
  const filteredKeywords = keywordDetails.filter(detail => !existingKeywordSet.has(detail.keyword))
  
  console.log(`🔍 중복 키워드 필터링: ${keywordDetails.length}개 → ${filteredKeywords.length}개 (중복 제외: ${keywordDetails.length - filteredKeywords.length}개)`)
  
  return filteredKeywords
}

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

    // 즉시 응답 반환 (504 타임아웃 방지)
    console.log(`🚀 수동수집 시작: "${seedKeyword}"`)
    
    // 백그라운드에서 수동수집 실행
    executeManualCollect(seedKeyword).catch(async (error) => {
      console.error(`❌ 수동수집 "${seedKeyword}" 실행 오류:`, error)
    })

    return NextResponse.json({
      message: `수동수집이 시작되었습니다: "${seedKeyword}"`,
      seedKeyword,
      status: 'started'
    })

  } catch (error: any) {
    console.error('수동수집 API 오류:', error)
    return NextResponse.json(
      {
        message: '수동수집 시작 중 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}

// 백그라운드에서 실행되는 수동수집 함수
async function executeManualCollect(seedKeyword: string) {
  try {
    const naverAPI = new NaverKeywordAPI()
    const documentAPI = new NaverDocumentAPI()

    // 연관키워드 수집
    console.log(`시드키워드 "${seedKeyword}" 연관키워드 수집 시작...`)
    const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword)
    
    if (relatedKeywords.length === 0) {
      console.log(`시드키워드 "${seedKeyword}" 연관키워드 없음`)
      return
    }

    console.log(`시드키워드 "${seedKeyword}" 연관키워드 ${relatedKeywords.length}개 수집됨`)

    // 🚀 고성능 병렬 처리: 다중 API 키 활용 + 메모리 최적화 + 실시간 배치 저장
    const batchSize = 50 // 배치 크기 축소 (타임아웃 방지)
    const processingConcurrency = 5 // 동시성 축소
    const documentConcurrency = 3 // 동시성 축소

    let totalSavedCount = 0
    let totalProcessedCount = 0
    const totalBatches = Math.ceil(relatedKeywords.length / batchSize)

    console.log(`🚀 고성능 병렬 처리 시작: ${relatedKeywords.length}개 키워드를 ${totalBatches}개 배치로 처리`)

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize
      const endIndex = Math.min(startIndex + batchSize, relatedKeywords.length)
      const batchKeywords = relatedKeywords.slice(startIndex, endIndex)
      
      try {
        // 1. 키워드 통계 수집 (병렬 처리)
        const keywordStats = await naverAPI.getBatchKeywordStats(batchKeywords, processingConcurrency)
        totalProcessedCount += keywordStats.length
        
        // 2. 문서수 수집 (병렬 처리)
        const keywordsForDocs = keywordStats.map(stat => stat.keyword)
        const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, documentConcurrency)
        
        // 3. 데이터 통합
        const batchKeywordDetails = keywordStats.map(stat => {
          const docCounts = documentCountsMap.get(stat.keyword) || { blog: 0, news: 0, webkr: 0, cafe: 0 }
          return {
            ...stat,
            blog_count: docCounts.blog,
            news_count: docCounts.news,
            webkr_count: docCounts.webkr,
            cafe_count: docCounts.cafe
          }
        })
        
        // 4. 데이터베이스에 저장 (중복 키워드 처리 포함)
        if (batchKeywordDetails.length > 0) {
          // 중복 키워드 필터링
          const filteredKeywords = await filterDuplicateKeywords(batchKeywordDetails)
          
          if (filteredKeywords.length > 0) {
            const insertData = filteredKeywords.map(detail => ({
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
              is_used_as_seed: false, // 수동수집으로 수집된 키워드는 기본적으로 미활용
              raw_json: detail.raw_json,
              fetched_at: detail.fetched_at
            }))

            const { error: insertError } = await supabase
              .from('manual_collection_results')
              .insert(insertData)

            if (insertError) {
              console.error(`❌ 배치 ${batchIndex + 1} 저장 실패:`, insertError)
            } else {
              totalSavedCount += filteredKeywords.length
              const duplicateCount = batchKeywordDetails.length - filteredKeywords.length
              console.log(`✅ 배치 ${batchIndex + 1} 저장 완료: ${filteredKeywords.length}개 키워드 (중복 제외: ${duplicateCount}개, 총 저장: ${totalSavedCount}개)`)
            }
          } else {
            console.log(`⏭️ 배치 ${batchIndex + 1}: 모든 키워드가 중복이므로 패스`)
          }
        }
        
        // 메모리 정리 (가비지 컬렉션 유도)
        if (global.gc) {
          global.gc()
        }

        // 다음 배치 시작 전 잠시 대기 (API 부하 분산 및 안정성)
        await new Promise(resolve => setTimeout(resolve, 500)) // 0.5초 대기

      } catch (batchError) {
        console.error(`❌ 배치 ${batchIndex + 1} 처리 실패:`, batchError)
      }
    }

    const successRate = totalProcessedCount > 0 ? ((totalSavedCount / totalProcessedCount) * 100).toFixed(1) : '0'
    console.log(`🎉 수동수집 완료! 시드키워드: "${seedKeyword}", 총 처리: ${totalProcessedCount}개, 저장: ${totalSavedCount}개, 성공률: ${successRate}%`)

  } catch (error: any) {
    console.error(`❌ 수동수집 "${seedKeyword}" 실행 중 오류:`, error)
  }
}