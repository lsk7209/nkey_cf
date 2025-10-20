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

    // 🧪 더미 데이터 테스트 (네이버 API 우회)
    console.log(`🧪 더미 데이터 테스트 모드 시작`)
    const relatedKeywords = [
      `${seedKeyword} 추천`,
      `${seedKeyword} 예약`,
      `${seedKeyword} 가격`,
      `${seedKeyword} 리뷰`,
      `${seedKeyword} 후기`
    ]
    
    console.log(`📊 더미 연관키워드 생성: ${relatedKeywords.length}개`)
    console.log(`📝 더미 키워드 목록:`, relatedKeywords)

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
      // 🧪 더미 키워드 데이터 생성 (API 호출 우회)
      console.log(`🧪 더미 키워드 데이터 생성 시작...`)
      const batchKeywordDetails: KeywordDetail[] = testKeywords.map(keyword => ({
        keyword: keyword,
        pc_search: Math.floor(Math.random() * 1000) + 100,
        mobile_search: Math.floor(Math.random() * 2000) + 200,
        total_search: Math.floor(Math.random() * 3000) + 300,
        monthly_click_pc: Math.floor(Math.random() * 100) + 10,
        monthly_click_mobile: Math.floor(Math.random() * 200) + 20,
        ctr_pc: Math.random() * 5 + 1,
        ctr_mobile: Math.random() * 8 + 2,
        ad_count: Math.floor(Math.random() * 50) + 5,
        comp_idx: 'MEDIUM',
        raw_json: JSON.stringify({ test: true }),
        fetched_at: new Date().toISOString(),
        blog_count: Math.floor(Math.random() * 500) + 50,
        news_count: Math.floor(Math.random() * 100) + 10,
        webkr_count: Math.floor(Math.random() * 1000) + 100,
        cafe_count: Math.floor(Math.random() * 300) + 30
      }))
      
      totalProcessedCount += batchKeywordDetails.length
      console.log(`🧪 더미 데이터 생성 완료:`, batchKeywordDetails.length, '개')
      console.log(`📊 더미 데이터 샘플:`, batchKeywordDetails[0])
      
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
      
    } catch (testError: any) {
      console.error(`❌ 테스트 처리 실패:`, testError)
      console.error(`❌ 테스트 오류 스택:`, testError?.stack)
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