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
    
    // Supabase 연결 상태 확인
    console.log(`🔍 Supabase 연결 상태 확인 중...`)
    const { supabase } = await import('@/lib/supabase')
    if (!supabase) {
      console.error(`❌ Supabase 클라이언트가 초기화되지 않음`)
      return {
        success: false,
        processedCount: 0,
        savedCount: 0,
        successRate: 0,
        error: 'Supabase 연결 실패'
      }
    }
    console.log(`✅ Supabase 클라이언트 연결 확인됨`)

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
    const batchSize = 10 // 배치 크기 (타임아웃 방지)
    const processingConcurrency = 3 // 동시성 (타임아웃 방지)
    const documentConcurrency = 2 // 동시성 (타임아웃 방지)

    let totalSavedCount = 0
    let totalProcessedCount = 0
    let batchKeywordDetails: KeywordDetail[] = [] // 스코프 문제 해결을 위해 외부로 이동
    const totalBatches = Math.ceil(relatedKeywords.length / batchSize)

    console.log(`🚀 연관키워드 배치 처리 시작: ${relatedKeywords.length}개 키워드 중 최대 1000개 처리`)

    // 연관키워드 처리 (최대 1000개, 50개씩 배치 처리)
    const allKeywords = relatedKeywords.slice(0, 1000)
    const batchSize = 50 // 50개씩 배치 처리
    const totalBatches = Math.ceil(allKeywords.length / batchSize)
    
    console.log(`🔍 총 처리할 키워드:`, allKeywords.length, '개')
    console.log(`📦 배치 처리:`, totalBatches, '개 배치 (각 50개씩)')

    // 배치별로 처리
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize
      const endIndex = Math.min(startIndex + batchSize, allKeywords.length)
      const batchKeywords = allKeywords.slice(startIndex, endIndex)
      
      console.log(`\n🔄 배치 ${batchIndex + 1}/${totalBatches} 처리 시작 (${batchKeywords.length}개 키워드)`)
      console.log(`📝 배치 키워드:`, batchKeywords.slice(0, 5)) // 처음 5개만 로그

      try {
        // 1. 키워드 통계 수집
        console.log(`📊 키워드 통계 수집 시작...`)
        const keywordStats = await naverAPI.getBatchKeywordStats(batchKeywords, 3)
        console.log(`📊 키워드 통계 수집 결과:`, keywordStats.length, '개')
        totalProcessedCount += keywordStats.length
        
        if (keywordStats.length === 0) {
          console.log(`⚠️ 배치 ${batchIndex + 1} 키워드 통계 수집 실패`)
          continue
        }

        // 2. 문서수 수집
        console.log(`📄 문서수 수집 시작...`)
        const keywordsForDocs = keywordStats.map(stat => stat.keyword)
        const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, 2)
        console.log(`📄 문서수 수집 결과:`, documentCountsMap.size, '개')
        
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
        
        console.log(`🔗 배치 ${batchIndex + 1} 데이터 통합 완료:`, batchKeywordDetails.length, '개')
        
        // 4. 데이터베이스에 저장 (중복 키워드 처리 포함)
        if (batchKeywordDetails.length > 0) {
          console.log(`💾 배치 ${batchIndex + 1} 데이터베이스 저장 시작...`)
          
          // 중복 키워드 필터링
          const filteredKeywords = await filterDuplicateKeywords(batchKeywordDetails)
          console.log(`🔍 배치 ${batchIndex + 1} 중복 필터링 후:`, filteredKeywords.length, '개')
          
          if (filteredKeywords.length > 0) {
            const insertData = transformToInsertData(filteredKeywords, seedKeyword, false)
            const result = await saveKeywordsBatch(insertData, batchIndex, totalBatches)
            
            if (result.success) {
              totalSavedCount += result.savedCount
              console.log(`✅ 배치 ${batchIndex + 1} 저장 성공:`, result.savedCount, '개`)
            } else {
              console.error(`❌ 배치 ${batchIndex + 1} 저장 실패:`, result.error)
            }
          } else {
            console.log(`⏭️ 배치 ${batchIndex + 1} 모든 키워드가 중복이므로 패스`)
          }
        } else {
          console.log(`⚠️ 배치 ${batchIndex + 1} 저장할 키워드 데이터가 없음`)
        }
        
        // 배치 간 대기 (API 제한 방지)
        if (batchIndex < totalBatches - 1) {
          console.log(`⏳ 다음 배치 처리 전 2초 대기...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
      } catch (batchError: any) {
        console.error(`❌ 배치 ${batchIndex + 1} 처리 실패:`, batchError)
        console.error(`❌ 배치 오류 상세:`, {
          name: batchError?.name,
          message: batchError?.message,
          cause: batchError?.cause
        })
        // 개별 배치 실패는 전체를 중단하지 않음
        continue
      }
    }

    const successRate = totalProcessedCount > 0 ? ((totalSavedCount / totalProcessedCount) * 100).toFixed(1) : '0'
    console.log(`🎉 수동수집 완료! 시드키워드: "${seedKeyword}", 총 처리: ${totalProcessedCount}개, 저장: ${totalSavedCount}개, 성공률: ${successRate}%`)

    return {
      success: true,
      processedCount: totalProcessedCount,
      savedCount: totalSavedCount,
      successRate: parseFloat(successRate),
      message: `수집 완료: ${totalProcessedCount}개 처리, ${totalSavedCount}개 저장 (배치 처리)`
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