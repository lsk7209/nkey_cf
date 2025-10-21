// D1 클라이언트는 별도로 주입받음

// 타입 정의
export interface KeywordDetail {
  keyword: string
  pc_search: number
  mobile_search: number
  total_search: number
  monthly_click_pc: number
  monthly_click_mobile: number
  ctr_pc: number
  ctr_mobile: number
  ad_count: number
  comp_idx: string
  blog_count?: number
  news_count?: number
  webkr_count?: number
  cafe_count?: number
  raw_json: string
  fetched_at: string
}

export interface DatabaseInsertData {
  seed_keyword: string
  keyword: string
  pc_search: number
  mobile_search: number
  total_search: number
  monthly_click_pc: number
  monthly_click_mobile: number
  ctr_pc: number
  ctr_mobile: number
  ad_count: number
  comp_idx: string
  blog_count: number
  news_count: number
  webkr_count: number
  cafe_count: number
  is_used_as_seed: boolean
  raw_json: string
  fetched_at: string
}

// 중복 키워드 필터링 함수 (D1 클라이언트 사용)
export async function filterDuplicateKeywords(keywordDetails: KeywordDetail[], d1Client: any): Promise<KeywordDetail[]> {
  if (keywordDetails.length === 0) return []
  
  const keywords = keywordDetails.map(detail => detail.keyword)
  
  try {
    const existingKeywords = await d1Client.filterDuplicateKeywords(keywords)
    const existingKeywordSet = new Set(keywords.filter(k => !existingKeywords.includes(k)))
    
    // 중복되지 않은 키워드만 필터링
    const filteredKeywords = keywordDetails.filter(detail => !existingKeywordSet.has(detail.keyword))
    
    console.log(`🔍 중복 키워드 필터링: ${keywordDetails.length}개 → ${filteredKeywords.length}개 (중복 제외: ${keywordDetails.length - filteredKeywords.length}개)`)
    
    return filteredKeywords
  } catch (error) {
    console.error('중복 키워드 필터링 중 오류:', error)
    return keywordDetails
  }
}

// 데이터베이스 삽입 데이터 변환 함수
export function transformToInsertData(
  keywordDetails: KeywordDetail[], 
  seedKeyword: string, 
  isUsedAsSeed: boolean = false
): DatabaseInsertData[] {
  return keywordDetails.map(detail => ({
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
    is_used_as_seed: isUsedAsSeed,
    raw_json: detail.raw_json,
    fetched_at: detail.fetched_at
  }))
}

// 배치 저장 함수 (D1 클라이언트 사용)
export async function saveKeywordsBatch(
  insertData: DatabaseInsertData[],
  batchIndex: number,
  totalBatches: number,
  d1Client: any
): Promise<{ success: boolean; savedCount: number; error?: string }> {
  try {
    console.log(`🔍 저장할 데이터 상세:`, {
      데이터개수: insertData.length,
      첫번째키워드: insertData[0]?.keyword,
      시드키워드: insertData[0]?.seed_keyword,
      샘플데이터: insertData[0]
    })
    
    console.log(`💾 D1 클라이언트 연결 확인 중...`)
    if (!d1Client) {
      console.error(`❌ D1 클라이언트가 초기화되지 않음`)
      return { success: false, savedCount: 0, error: 'D1 클라이언트 초기화 실패' }
    }
    
    console.log(`📡 D1 데이터베이스 삽입 시작...`)
    const result = await d1Client.saveManualCollectionResults(insertData)

    if (!result.success) {
      console.error(`❌ 배치 ${batchIndex + 1}/${totalBatches} 저장 실패:`, result.error)
      return { success: false, savedCount: 0, error: result.error }
    }

    console.log(`✅ 배치 ${batchIndex + 1}/${totalBatches} 저장 완료: ${result.savedCount}개 키워드`)
    return { success: true, savedCount: result.savedCount }
  } catch (error: any) {
    console.error(`❌ 배치 ${batchIndex + 1}/${totalBatches} 저장 중 오류:`, error)
    console.error(`❌ 오류 스택:`, error.stack)
    return { success: false, savedCount: 0, error: error.message }
  }
}

// 메모리 정리 함수
export function cleanupMemory(): void {
  if (global.gc) {
    global.gc()
  }
}

// 지연 함수
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 에러 로깅 함수
export function logError(context: string, error: any): void {
  console.error(`❌ ${context}:`, error)
}

// 성공 로깅 함수
export function logSuccess(context: string, message: string): void {
  console.log(`✅ ${context}: ${message}`)
}

// 진행 상황 로깅 함수
export function logProgress(context: string, current: number, total: number, message?: string): void {
  const percentage = ((current / total) * 100).toFixed(1)
  const logMessage = message ? `${message} (${current}/${total}, ${percentage}%)` : `진행률: ${current}/${total} (${percentage}%)`
  console.log(`📊 ${context}: ${logMessage}`)
}
