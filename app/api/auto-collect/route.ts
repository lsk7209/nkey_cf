import { NextRequest, NextResponse } from 'next/server'
import { NaverKeywordAPI } from '@/lib/naver-api'
import { NaverDocumentAPI } from '@/lib/naver-document-api'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetCount } = body

    if (!targetCount || typeof targetCount !== 'number' || targetCount < 100) {
      return NextResponse.json(
        { message: '목표 수집개수는 100개 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const naverAPI = new NaverKeywordAPI()
    const documentAPI = new NaverDocumentAPI()

    // 🚀 자동수집 시작
    const startTime = Date.now()
    console.log(`🤖 자동수집 시작: 목표 ${targetCount}개 키워드 (${new Date().toISOString()})`)
    
    let totalCollected = 0
    let totalSaved = 0
    let batchNumber = 1

    // 기존에 수집된 키워드 중 시드활용되지 않은 키워드들을 가져오기
    const { data: unusedKeywords, error: fetchError } = await supabase
      .from('manual_collection_results')
      .select('id, keyword, total_search')
      .eq('is_used_as_seed', false)
      .order('total_search', { ascending: false })
      .limit(1000) // 최대 1000개까지 시드키워드로 활용

    if (fetchError) {
      console.error('시드키워드 조회 오류:', fetchError)
      return NextResponse.json(
        { message: '시드키워드 조회에 실패했습니다.', error: fetchError.message },
        { status: 500 }
      )
    }

    if (!unusedKeywords || unusedKeywords.length === 0) {
      return NextResponse.json(
        { message: '시드키워드로 활용할 수 있는 키워드가 없습니다.' },
        { status: 200 }
      )
    }

    console.log(`📋 시드키워드 후보: ${unusedKeywords.length}개`)

    // 시드키워드들을 순차적으로 활용하여 자동수집
    for (let i = 0; i < unusedKeywords.length && totalCollected < targetCount; i++) {
      const seedKeyword = unusedKeywords[i]
      
      console.log(`🌱 배치 ${batchNumber}: "${seedKeyword.keyword}" 시드키워드로 수집 시작`)
      
      try {
        // 1. 연관키워드 수집
        const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword.keyword)
        
        if (relatedKeywords.length === 0) {
          console.log(`⚠️ "${seedKeyword.keyword}" 연관키워드 없음, 다음 키워드로 이동`)
          continue
        }

        // 2. 실시간 배치 저장 (100개씩)
        const batchSize = 100
        const totalBatches = Math.ceil(relatedKeywords.length / batchSize)
        
        for (let batchIndex = 0; batchIndex < totalBatches && totalCollected < targetCount; batchIndex++) {
          const startIndex = batchIndex * batchSize
          const endIndex = Math.min(startIndex + batchSize, relatedKeywords.length)
          const batchKeywords = relatedKeywords.slice(startIndex, endIndex)
          
          console.log(`📦 배치 ${batchNumber}-${batchIndex + 1}: ${batchKeywords.length}개 키워드 처리 중`)
          
          try {
            // 키워드 통계 수집
            const keywordStats = await naverAPI.getBatchKeywordStats(batchKeywords, 10)
            
            // 문서수 수집
            const keywordsForDocs = keywordStats.map(stat => stat.keyword)
            const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, 5)
            
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
            
            // 데이터베이스에 저장
            if (batchKeywordDetails.length > 0) {
              const insertData = batchKeywordDetails.map(detail => ({
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
                is_used_as_seed: false, // 새로 수집된 키워드는 기본적으로 미활용
                raw_json: detail.raw_json,
                fetched_at: detail.fetched_at
              }))

              const { error: insertError } = await supabase
                .from('manual_collection_results')
                .insert(insertData)

              if (insertError) {
                console.error(`❌ 배치 ${batchNumber}-${batchIndex + 1} 저장 실패:`, insertError)
              } else {
                totalSaved += batchKeywordDetails.length
                totalCollected += batchKeywordDetails.length
                console.log(`✅ 배치 ${batchNumber}-${batchIndex + 1} 저장 완료: ${batchKeywordDetails.length}개 (총 수집: ${totalCollected}개)`)
              }
            }
            
            // 목표 달성 시 중단
            if (totalCollected >= targetCount) {
              console.log(`🎯 목표 달성: ${totalCollected}개 수집 완료`)
              break
            }
            
          } catch (batchError) {
            console.error(`❌ 배치 ${batchNumber}-${batchIndex + 1} 처리 실패:`, batchError)
          }
        }
        
        // 시드키워드 활용 완료 표시
        const { error: updateError } = await supabase
          .from('manual_collection_results')
          .update({ is_used_as_seed: true })
          .eq('id', seedKeyword.id)

        if (updateError) {
          console.error(`시드키워드 "${seedKeyword.keyword}" 활용 표시 실패:`, updateError)
        } else {
          console.log(`✅ 시드키워드 "${seedKeyword.keyword}" 활용 완료`)
        }
        
        batchNumber++
        
        // 목표 달성 시 중단
        if (totalCollected >= targetCount) {
          break
        }
        
      } catch (seedError) {
        console.error(`❌ 시드키워드 "${seedKeyword.keyword}" 처리 실패:`, seedError)
        // 개별 시드키워드 실패는 전체를 중단하지 않음
      }
    }
    
    const endTime = Date.now()
    const totalTime = (endTime - startTime) / 1000
    
    console.log(`🎉 자동수집 완료!`)
    console.log(`📊 수집 결과: ${totalCollected}개 수집, ${totalSaved}개 저장`)
    console.log(`⏱️ 총 처리 시간: ${totalTime.toFixed(2)}초`)
    console.log(`🌱 활용된 시드키워드: ${batchNumber - 1}개`)

    return NextResponse.json({
      message: '자동수집 완료',
      totalCollected,
      totalSaved,
      seedsUsed: batchNumber - 1,
      totalTime: totalTime.toFixed(2),
      successRate: totalCollected > 0 ? ((totalSaved / totalCollected) * 100).toFixed(1) : 0
    })

  } catch (error: any) {
    console.error('자동수집 API 오류:', error)
    return NextResponse.json(
      {
        message: '자동수집 중 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
