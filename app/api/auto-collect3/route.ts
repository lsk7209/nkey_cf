import { NextRequest, NextResponse } from 'next/server'
import { NaverKeywordAPI } from '@/lib/naver-api'
import { NaverDocumentAPI } from '@/lib/naver-document-api'
import { D1Client } from '@/lib/d1-client'
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

export const runtime = 'edge'

// 자동수집3 상태 업데이트 함수
async function updateAutoCollect3Status(updates: any, d1Client: D1Client) {
  try {
    await d1Client.updateAutoCollect3Status(updates)
  } catch (error) {
    console.error('자동수집3 상태 업데이트 중 오류:', error)
  }
}

export async function POST(request: NextRequest, { params }: { params: any }) {
  try {
    const body = await request.json()
    const { seedCount, keywordsPerSeed } = body

    if (!seedCount || typeof seedCount !== 'number' || seedCount < 1 || seedCount > 100) {
      return NextResponse.json(
        { message: '시드키워드 개수는 1-100개 사이여야 합니다.' },
        { status: 400 }
      )
    }

    if (!keywordsPerSeed || typeof keywordsPerSeed !== 'number' || keywordsPerSeed < 100 || keywordsPerSeed > 1000) {
      return NextResponse.json(
        { message: '시드키워드당 수집개수는 100-1000개 사이여야 합니다.' },
        { status: 400 }
      )
    }

    const d1Client = new D1Client(params.env.DB)

    // 기존 자동수집3이 실행 중인지 확인
    const existingStatus = await d1Client.getAutoCollect3Status()

    if (existingStatus?.is_running) {
      return NextResponse.json(
        { message: '자동수집3이 이미 실행 중입니다.' },
        { status: 409 }
      )
    }

    // 자동수집3 상태를 시작으로 업데이트
    await d1Client.updateAutoCollect3Status({
      is_running: true,
      current_seed: null,
      seeds_processed: 0,
      total_seeds: seedCount,
      keywords_collected: 0,
      start_time: new Date().toISOString(),
      end_time: null,
      status_message: '자동수집3 시작 중...',
      error_message: null
    })

    // 즉시 자동수집3 실행 (Vercel 무료 플랜 대응)
    console.log('🚀 자동수집3 즉시 실행 시작:', { seedCount, keywordsPerSeed })
    
    // 응답을 먼저 보내고 자동수집 실행
    const responsePromise = NextResponse.json({
      message: '자동수집3이 시작되었습니다.',
      seedCount,
      keywordsPerSeed
    })

    // 자동수집 실행 (응답과 병렬로)
    executeAutoCollect3(seedCount, keywordsPerSeed, d1Client).catch(async (error) => {
      console.error('자동수집3 실행 오류:', error)
      await updateAutoCollect3Status({
        is_running: false,
        end_time: new Date().toISOString(),
        status_message: '자동수집3 실행 중 오류 발생',
        error_message: (error as any)?.message || String(error)
      }, d1Client)
    })

    return responsePromise

  } catch (error: any) {
    console.error('자동수집3 API 오류:', error)
    return NextResponse.json(
      {
        message: '자동수집3 시작 중 오류가 발생했습니다.',
        error: (error as any)?.message || String(error)
      },
      { status: 500 }
    )
  }
}

// 백그라운드에서 실행되는 자동수집3 함수
async function executeAutoCollect3(seedCount: number, keywordsPerSeed: number, d1Client: D1Client) {
  const naverAPI = new NaverKeywordAPI()
  const documentAPI = new NaverDocumentAPI()

  const startTime = Date.now()
  console.log(`🚀 자동수집3 시작: ${seedCount}개 시드키워드, 시드당 ${keywordsPerSeed}개 (${new Date().toISOString()})`)
  
  let totalKeywordsCollected = 0
  let seedsProcessed = 0

  try {
    // 기존에 수집된 키워드 중 시드로 사용되지 않은 키워드를 검색량 높은 순으로 선택
    console.log('📋 시드키워드 조회 시작...')
    const availableKeywords = await d1Client.getAvailableSeedKeywords(seedCount)
    
    console.log('📋 시드키워드 조회 완료:', availableKeywords?.length || 0, '개')
    
    if (availableKeywords && availableKeywords.length > 0) {
      console.log('📋 시드키워드 목록:', availableKeywords.map((k: any) => `${k.keyword}(${k.total_search})`).join(', '))
    }

    if (!availableKeywords || availableKeywords.length === 0) {
      await updateAutoCollect3Status({
        is_running: false,
        end_time: new Date().toISOString(),
        status_message: '시드키워드로 활용할 수 있는 키워드가 없습니다.'
      }, d1Client)
      return
    }

    // 시드키워드들을 순차적으로 처리
    for (let i = 0; i < availableKeywords.length; i++) {
      const seedKeyword = availableKeywords[i]
      seedsProcessed = i
      
      console.log(`🌱 시드키워드 ${i + 1}/${availableKeywords.length}: "${seedKeyword.keyword}" 처리 시작`)
      
      // 현재 시드키워드 상태 업데이트
      await updateAutoCollect3Status({
        current_seed: seedKeyword.keyword,
        seeds_processed: seedsProcessed,
        status_message: `"${seedKeyword.keyword}" 시드키워드 처리 중... (${i + 1}/${availableKeywords.length})`
      }, d1Client)
      
      try {
        // 1. 연관키워드 수집
        const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword.keyword)
        
        if (relatedKeywords.length === 0) {
          console.log(`[${seedKeyword.keyword}] 수집된 연관 키워드가 없습니다.`)
          continue
        }

        // 최대 keywordsPerSeed개까지만 수집
        const keywordsToProcess = relatedKeywords.slice(0, keywordsPerSeed)
        console.log(`[${seedKeyword.keyword}] ${keywordsToProcess.length}개 연관키워드 수집됨`)

        // 2. 키워드 통계 및 문서수 수집 (배치 처리)
        const batchSize = 100
        const processingConcurrency = 10
        const documentConcurrency = 5

        const totalBatches = Math.ceil(keywordsToProcess.length / batchSize)

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIndex = batchIndex * batchSize
          const endIndex = Math.min(startIndex + batchSize, keywordsToProcess.length)
          const batchKeywords = keywordsToProcess.slice(startIndex, endIndex)
          
          try {
            // 키워드 통계 수집
            const keywordStats = await naverAPI.getBatchKeywordStats(batchKeywords, processingConcurrency)
            
            // 문서수 수집
            const keywordsForDocs = keywordStats.map(stat => stat.keyword)
            const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, documentConcurrency)
            
            // 데이터 통합 및 저장
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
            
            // 데이터베이스에 저장 (중복 키워드 처리 포함)
            if (batchKeywordDetails.length > 0) {
              // 중복 키워드 필터링
              const filteredKeywords = await filterDuplicateKeywords(batchKeywordDetails, d1Client)
              
              if (filteredKeywords.length > 0) {
                const insertData = filteredKeywords.map(detail => ({
                  seed_keyword: seedKeyword.keyword,
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
                  is_used_as_seed: false,
                  raw_json: detail.raw_json,
                  fetched_at: detail.fetched_at
                }))

                const result = await d1Client.saveManualCollectionResults(insertData)

                if (!result.success) {
                  console.error(`❌ 배치 ${batchIndex + 1} 데이터베이스 저장 오류:`, result.error)
                } else {
                  totalKeywordsCollected += result.savedCount
                  const duplicateCount = batchKeywordDetails.length - filteredKeywords.length
                  console.log(`✅ 배치 ${batchIndex + 1} 저장 완료: ${result.savedCount}개 키워드 (중복 제외: ${duplicateCount}개)`)
                }
              } else {
                console.log(`⏭️ 배치 ${batchIndex + 1}: 모든 키워드가 중복이므로 패스`)
              }
            }
            
            // 메모리 정리
            if (global.gc) {
              global.gc()
            }

            // 다음 배치 시작 전 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 200))

          } catch (batchError) {
            console.error(`❌ 배치 ${batchIndex + 1} 처리 실패:`, batchError)
          }
        }
        
        // 시드키워드 사용 완료 표시
        try {
          await d1Client.db.prepare(`
            UPDATE manual_collection_results 
            SET is_used_as_seed = true 
            WHERE id = ?
          `).bind(seedKeyword.id).run()
          console.log(`✅ 시드키워드 "${seedKeyword.keyword}" 사용 완료 표시됨`)
        } catch (updateSeedError) {
          console.error(`시드키워드 "${seedKeyword.keyword}" 사용 표시 실패:`, updateSeedError)
        }
        
        console.log(`✅ 시드키워드 "${seedKeyword.keyword}" 처리 완료: ${totalKeywordsCollected}개 키워드 수집됨`)
        
        // 진행 상태 업데이트
        await updateAutoCollect3Status({
          keywords_collected: totalKeywordsCollected,
          status_message: `"${seedKeyword.keyword}" 완료: ${totalKeywordsCollected}개 키워드 수집됨`
        }, d1Client)
        
      } catch (seedError) {
        console.error(`❌ 시드키워드 "${seedKeyword.keyword}" 처리 실패:`, seedError)
      }
    }
    
    const endTime = Date.now()
    const totalTime = (endTime - startTime) / 1000
    
    console.log(`🎉 자동수집3 완료!`)
    console.log(`📊 수집 결과: ${seedsProcessed + 1}개 시드키워드 처리, ${totalKeywordsCollected}개 키워드 수집`)
    console.log(`⏱️ 총 처리 시간: ${totalTime.toFixed(2)}초`)

    // 자동수집3 완료 상태 업데이트
    await updateAutoCollect3Status({
      is_running: false,
      end_time: new Date().toISOString(),
      current_seed: null,
      seeds_processed: seedsProcessed + 1,
      keywords_collected: totalKeywordsCollected,
      status_message: `자동수집3 완료! ${totalKeywordsCollected}개 키워드 수집됨 (${totalTime.toFixed(2)}초)`
    }, d1Client)

  } catch (error: any) {
    console.error('자동수집3 실행 중 오류:', error)
    
    // 오류 상태 업데이트
    await updateAutoCollect3Status({
      is_running: false,
      end_time: new Date().toISOString(),
      status_message: '자동수집3 중 오류 발생',
      error_message: (error as any)?.message || String(error)
    }, d1Client)
  }
}
