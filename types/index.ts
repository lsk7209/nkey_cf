// API 응답 타입
export interface NaverApiResponse {
  keywordList: NaverKeywordData[]
}

export interface NaverKeywordData {
  relKeyword: string
  monthlyPcQcCnt: number
  monthlyMobileQcCnt: number
  monthlyAvePcClkCnt: number
  monthlyAveMobileClkCnt: number
  monthlyAvePcCtr: number
  monthlyAveMobileCtr: number
  plAvgDepth: number
  compIdx: string
}

export interface ProcessedKeywordData {
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

// 데이터베이스 타입
export interface KeywordData {
  id: string
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
  created_at: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// 자동수집 상태 타입
export interface AutoCollectStatus {
  id: number
  is_running: boolean
  current_seed: string | null
  seeds_processed: number
  total_seeds: number
  keywords_collected: number
  start_time: string | null
  end_time: string | null
  status_message: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

// API 키 관리 타입
export interface ApiKeyInfo {
  id: string
  name: string
  apiKey: string
  secret: string
  customerId: string
  dailyUsage: number
  lastUsed: Date
  isActive: boolean
}

export interface OpenApiKeyInfo {
  id: string
  name: string
  clientId: string
  clientSecret: string
  dailyUsage: number
  lastUsed: number
  isActive: boolean
}

// 문서수 타입
export interface DocumentCounts {
  blog: number
  news: number
  webkr: number
  cafe: number
}

// 에러 타입
export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

// 필터 타입
export interface DataFilters {
  search?: string
  seedKeyword?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  totalSearchMin?: number
  totalSearchMax?: number
  cafeCountMin?: number
  cafeCountMax?: number
  blogCountMin?: number
  blogCountMax?: number
  newsCountMin?: number
  newsCountMax?: number
  webkrCountMin?: number
  webkrCountMax?: number
}
