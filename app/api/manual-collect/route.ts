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

    const naverAPI = new NaverKeywordAPI()
    const documentAPI = new NaverDocumentAPI()

    // 연관키워드 수집
    console.log(`시드키워드 "${seedKeyword}" 연관키워드 수집 시작...`)
    const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword)
    
    if (relatedKeywords.length === 0) {
      return NextResponse.json(
        {
          message: '연관키워드를 찾을 수 없습니다.',
          seedKeyword,
          keywords: [],
          savedCount: 0
        },
        { status: 200 }
      )
    }

    // 🚀 실시간 배치 저장: 중간 실패 시에도 데이터 보존
    const startTime = Date.now();
    console.log(`🚀 실시간 배치 저장 시작: ${relatedKeywords.length}개 키워드 (${new Date().toISOString()})`);
    
    // 실시간 저장을 위한 배치 처리
    const batchSize = 100; // 100개씩 처리하여 실시간 저장
    const totalBatches = Math.ceil(relatedKeywords.length / batchSize);
    let totalSavedCount = 0;
    let totalProcessedCount = 0;
    const allKeywordDetails: any[] = [];
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, relatedKeywords.length);
      const batchKeywords = relatedKeywords.slice(startIndex, endIndex);
      
      console.log(`📦 배치 ${batchIndex + 1}/${totalBatches} 처리 중: ${batchKeywords.length}개 키워드`);
      
      try {
        // 1단계: 키워드 통계 수집 (병렬 처리)
        console.log(`📊 배치 ${batchIndex + 1} - 1단계: 키워드 통계 수집 중...`);
        const keywordStats = await naverAPI.getBatchKeywordStats(batchKeywords, 10);
        console.log(`✅ 배치 ${batchIndex + 1} - 1단계 완료: ${keywordStats.length}개 키워드 통계 수집됨`);
        
        // 2단계: 문서수 수집 (병렬 처리)
        console.log(`📄 배치 ${batchIndex + 1} - 2단계: 문서수 수집 중...`);
        const keywordsForDocs = keywordStats.map(stat => stat.keyword);
        const documentCountsMap = await documentAPI.getBatchDocumentCounts(keywordsForDocs, 5);
        console.log(`✅ 배치 ${batchIndex + 1} - 2단계 완료: ${documentCountsMap.size}개 키워드 문서수 수집됨`);
        
        // 3단계: 데이터 통합 및 실시간 저장
        console.log(`💾 배치 ${batchIndex + 1} - 3단계: 실시간 저장 중...`);
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
        
        // 실시간 데이터베이스 저장 (중복 키워드 처리 포함)
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
            }));

            const { error: insertError } = await supabase
              .from('manual_collection_results')
              .insert(insertData);

            if (insertError) {
              console.error(`❌ 배치 ${batchIndex + 1} 저장 실패:`, insertError);
            } else {
              totalSavedCount += filteredKeywords.length;
              const duplicateCount = batchKeywordDetails.length - filteredKeywords.length;
              console.log(`✅ 배치 ${batchIndex + 1} 저장 완료: ${filteredKeywords.length}개 키워드 (중복 제외: ${duplicateCount}개, 총 저장: ${totalSavedCount}개)`);
            }
          } else {
            console.log(`⏭️ 배치 ${batchIndex + 1}: 모든 키워드가 중복이므로 패스`);
          }
        }
        
        // 전체 결과에 추가 (응답용)
        allKeywordDetails.push(...batchKeywordDetails);
        totalProcessedCount += batchKeywords.length;
        
        // 메모리 정리 (가비지 컬렉션 유도)
        if (batchIndex % 5 === 0) {
          if (global.gc) {
            global.gc();
          }
        }
        
      } catch (batchError) {
        console.error(`❌ 배치 ${batchIndex + 1} 처리 실패:`, batchError);
        // 개별 배치 실패는 전체를 중단하지 않음
        totalProcessedCount += batchKeywords.length;
      }
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`🎉 실시간 배치 저장 완료!`);
    console.log(`📊 처리 결과: ${totalProcessedCount}개 처리, ${totalSavedCount}개 저장`);
    console.log(`⏱️ 총 처리 시간: ${totalTime.toFixed(2)}초`);
    console.log(`💾 저장 성공률: ${totalProcessedCount > 0 ? ((totalSavedCount / totalProcessedCount) * 100).toFixed(1) : 0}%`);

    return NextResponse.json({
      message: '수집 완료',
      seedKeyword,
      keywords: allKeywordDetails,
      savedCount: totalSavedCount,
      processedCount: totalProcessedCount,
      successRate: totalProcessedCount > 0 ? ((totalSavedCount / totalProcessedCount) * 100).toFixed(1) : 0
    })

  } catch (error: any) {
    console.error('수동수집 API 오류:', error)
    return NextResponse.json(
      {
        message: '수집 중 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}