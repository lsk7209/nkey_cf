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
  console.log(`🔍 수동수집 디버깅 시작: "${seedKeyword}"`)
  
  try {
    console.log(`📡 NaverKeywordAPI 인스턴스 생성 중...`)
    const naverAPI = new NaverKeywordAPI()
    console.log(`📡 NaverDocumentAPI 인스턴스 생성 중...`)
    const documentAPI = new NaverDocumentAPI()

    // 연관키워드 수집
    console.log(`🔍 시드키워드 "${seedKeyword}" 연관키워드 수집 시작...`)
    const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword)
    console.log(`📊 연관키워드 수집 결과: ${relatedKeywords.length}개`)
    
    if (relatedKeywords.length === 0) {
      console.log(`⚠️ 시드키워드 "${seedKeyword}" 연관키워드 없음`)
      return
    }

    console.log(`✅ 시드키워드 "${seedKeyword}" 연관키워드 ${relatedKeywords.length}개 수집됨`)
    console.log(`📝 연관키워드 목록:`, relatedKeywords.slice(0, 5)) // 처음 5개만 로그

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
      const keywordStats = await naverAPI.getBatchKeywordStats(testKeywords, 1)
      console.log(`📊 키워드 통계 수집 결과:`, keywordStats.length, '개')
      totalProcessedCount += keywordStats.length
      
      if (keywordStats.length === 0) {
        console.log(`⚠️ 키워드 통계 수집 실패`)
        return
      }

      // 2. 문서수 수집 (단일 키워드)
      console.log(`📄 문서수 수집 시작...`)
      const keywordsForDocs = keywordStats.map(stat => stat.keyword)
      const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, 1)
      console.log(`📄 문서수 수집 결과:`, documentCountsMap.size, '개')
      
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
        // 중복 키워드 필터링
        const filteredKeywords = await filterDuplicateKeywords(batchKeywordDetails)
        console.log(`🔍 중복 필터링 후:`, filteredKeywords.length, '개')
        
        if (filteredKeywords.length > 0) {
          const insertData = transformToInsertData(filteredKeywords, seedKeyword, false)
          console.log(`📝 저장할 데이터:`, insertData.length, '개')
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
      }
      
    } catch (testError) {
      console.error(`❌ 테스트 처리 실패:`, testError)
      console.error(`❌ 테스트 오류 스택:`, testError.stack)
    }

    const successRate = totalProcessedCount > 0 ? ((totalSavedCount / totalProcessedCount) * 100).toFixed(1) : '0'
    console.log(`🎉 수동수집 완료! 시드키워드: "${seedKeyword}", 총 처리: ${totalProcessedCount}개, 저장: ${totalSavedCount}개, 성공률: ${successRate}%`)

  } catch (error: any) {
    console.error(`❌ 수동수집 "${seedKeyword}" 실행 중 오류:`, error)
    console.error(`❌ 오류 스택:`, error.stack)
    console.error(`❌ 오류 상세:`, {
      name: error.name,
      message: error.message,
      cause: error.cause
    })
  }
}