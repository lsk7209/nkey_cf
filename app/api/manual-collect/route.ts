import { NextRequest, NextResponse } from 'next/server'
import { NaverKeywordAPI } from '@/lib/naver-api'
import { NaverDocumentAPI } from '@/lib/naver-document-api'
import { 
  filterDuplicateKeywords, 
  transformToInsertData, 
  saveKeywordsBatch, 
  cleanupMemory, 
  delay,
  logError,
  logSuccess,
  logProgress,
  type KeywordDetail
} from '@/lib/utils'

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

        console.log(`🚀 수동수집 시작: "${seedKeyword}"`)
        
        // 즉시 실행 (백그라운드 실행 방식 제거)
        try {
          const result = await executeManualCollect(seedKeyword)
          return NextResponse.json({
            message: `수동수집이 완료되었습니다: "${seedKeyword}"`,
            seedKeyword,
            status: 'completed',
            result
          })
        } catch (error: any) {
          console.error(`❌ 수동수집 "${seedKeyword}" 실행 오류:`, error)
          return NextResponse.json({
            message: `수동수집 중 오류가 발생했습니다: "${seedKeyword}"`,
            seedKeyword,
            status: 'error',
            error: error?.message || String(error)
          }, { status: 500 })
        }

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
  console.log(`🔍 수동수집 디버깅 시작: "${seedKeyword}"`)
  
  try {
    console.log(`📡 NaverKeywordAPI 인스턴스 생성 중...`)
    const naverAPI = new NaverKeywordAPI()
    console.log(`📡 NaverDocumentAPI 인스턴스 생성 중...`)
    const documentAPI = new NaverDocumentAPI()

    // 연관키워드 수집 (실제 네이버 API 사용)
    console.log(`🔍 시드키워드 "${seedKeyword}" 연관키워드 수집 시작...`)
    
    // 타임아웃 설정 (60초)
    const timeoutPromise = new Promise<string[]>((_, reject) => {
      setTimeout(() => reject(new Error('연관키워드 수집 타임아웃 (60초)')), 60000)
    })
    
    const relatedKeywordsPromise = naverAPI.getRelatedKeywords(seedKeyword)
    
    let relatedKeywords: string[] = []
    try {
      relatedKeywords = await Promise.race([relatedKeywordsPromise, timeoutPromise])
      console.log(`📊 연관키워드 수집 결과: ${relatedKeywords.length}개`)
      console.log(`📝 연관키워드 목록:`, relatedKeywords.slice(0, 10)) // 처음 10개 로그
    } catch (timeoutError) {
      console.error(`⏰ 연관키워드 수집 타임아웃:`, timeoutError)
      console.log(`🔄 타임아웃으로 인한 수동수집 중단`)
      return {
        success: false,
        processedCount: 0,
        savedCount: 0,
        successRate: 0,
        error: '연관키워드 수집 타임아웃'
      }
    }
    
    if (relatedKeywords.length === 0) {
      console.log(`⚠️ 시드키워드 "${seedKeyword}" 연관키워드 없음`)
      return {
        success: false,
        processedCount: 0,
        savedCount: 0,
        successRate: 0,
        error: '연관키워드 없음'
      }
    }

    console.log(`✅ 시드키워드 "${seedKeyword}" 연관키워드 ${relatedKeywords.length}개 수집됨`)

    // 🚀 고성능 병렬 처리: 다중 API 키 활용 + 메모리 최적화 + 실시간 배치 저장
    const batchSize = 10 // 배치 크기 더 축소 (안정성 우선)
    const processingConcurrency = 3 // 동시성 축소
    const documentConcurrency = 2 // 동시성 축소

    let totalSavedCount = 0
    let totalProcessedCount = 0
    const totalBatches = Math.ceil(relatedKeywords.length / batchSize)

    console.log(`🚀 간단한 테스트 모드 시작: ${relatedKeywords.length}개 키워드를 ${totalBatches}개 배치로 처리`)

    // 간단한 테스트: 첫 번째 키워드만 처리
    const testKeywords = relatedKeywords.slice(0, 1)
    console.log(`🧪 테스트 키워드:`, testKeywords)

    try {
      // 1. 키워드 통계 수집 (단일 키워드)
      console.log(`📊 키워드 통계 수집 시작...`)
      console.log(`📝 수집할 키워드:`, testKeywords)
      
      const keywordStats = await naverAPI.getBatchKeywordStats(testKeywords, 1)
      console.log(`📊 키워드 통계 수집 결과:`, keywordStats.length, '개')
      console.log(`📊 수집된 통계 데이터:`, keywordStats)
      totalProcessedCount += keywordStats.length
      
      if (keywordStats.length === 0) {
        console.log(`⚠️ 키워드 통계 수집 실패 - API 응답 없음`)
        return {
          success: false,
          processedCount: 0,
          savedCount: 0,
          successRate: 0,
          error: '키워드 통계 수집 실패'
        }
      }

      // 2. 문서수 수집 (단일 키워드)
      console.log(`📄 문서수 수집 시작...`)
      const keywordsForDocs = keywordStats.map(stat => stat.keyword)
      console.log(`📝 문서수 수집할 키워드:`, keywordsForDocs)
      
      const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, 1)
      console.log(`📄 문서수 수집 결과:`, documentCountsMap.size, '개')
      console.log(`📄 문서수 데이터:`, Object.fromEntries(documentCountsMap))
      
      // 3. 데이터 통합
      const batchKeywordDetails: KeywordDetail[] = keywordStats.map(stat => {
        const docCounts = documentCountsMap.get(stat.keyword) || { blog: 0, news: 0, webkr: 0, cafe: 0 }
        return {
          ...stat,
          blog_count: docCounts.blog,
          news_count: docCounts.news,
          webkr_count: docCounts.webkr,
          cafe_count: docCounts.cafe
        }
      })
      
      console.log(`🔗 데이터 통합 완료:`, batchKeywordDetails.length, '개')
      
      // 4. 데이터베이스에 저장 (중복 키워드 처리 포함)
      if (batchKeywordDetails.length > 0) {
        console.log(`💾 데이터베이스 저장 시작...`)
        console.log(`📊 저장할 키워드 상세:`, batchKeywordDetails)
        
        // 중복 키워드 필터링
        const filteredKeywords = await filterDuplicateKeywords(batchKeywordDetails)
        console.log(`🔍 중복 필터링 후:`, filteredKeywords.length, '개')
        console.log(`🔍 필터링된 키워드:`, filteredKeywords)
        
        if (filteredKeywords.length > 0) {
          const insertData = transformToInsertData(filteredKeywords, seedKeyword, false)
          console.log(`📝 저장할 데이터:`, insertData.length, '개')
          console.log(`📝 저장할 데이터 상세:`, insertData)
          
          const result = await saveKeywordsBatch(insertData, 0, 1)
          
          if (result.success) {
            totalSavedCount += result.savedCount
            console.log(`✅ 저장 성공:`, result.savedCount, '개')
          } else {
            console.error(`❌ 저장 실패:`, result.error)
          }
        } else {
          console.log(`⏭️ 모든 키워드가 중복이므로 패스`)
        }
      } else {
        console.log(`⚠️ 저장할 키워드 데이터가 없음`)
      }
      
    } catch (testError: any) {
      console.error(`❌ 테스트 처리 실패:`, testError)
      console.error(`❌ 테스트 오류 스택:`, testError?.stack)
    }

    const successRate = totalProcessedCount > 0 ? ((totalSavedCount / totalProcessedCount) * 100).toFixed(1) : '0'
    console.log(`🎉 수동수집 완료! 시드키워드: "${seedKeyword}", 총 처리: ${totalProcessedCount}개, 저장: ${totalSavedCount}개, 성공률: ${successRate}%`)

    return {
      success: true,
      processedCount: totalProcessedCount,
      savedCount: totalSavedCount,
      successRate: parseFloat(successRate)
    }

  } catch (error: any) {
    console.error(`❌ 수동수집 "${seedKeyword}" 실행 중 오류:`, error)
    console.error(`❌ 오류 스택:`, error.stack)
    console.error(`❌ 오류 상세:`, {
      name: error.name,
      message: error.message,
      cause: error.cause
    })
    
    throw error // 오류를 다시 던져서 상위에서 처리하도록 함
  }
}