import CryptoJS from 'crypto-js';

export interface NaverKeywordData {
  relKeyword: string;
  monthlyPcQcCnt: string;
  monthlyMobileQcCnt: string;
  monthlyAvePcClkCnt: string;
  monthlyAveMobileClkCnt: string;
  monthlyAvePcCtr: string;
  monthlyAveMobileCtr: string;
  plAvgDepth: string;
  compIdx: string;
}

export interface NaverApiResponse {
  keywordList: NaverKeywordData[];
}

export interface ProcessedKeywordData {
  keyword: string;
  pc_search: number;
  mobile_search: number;
  total_search: number;
  monthly_click_pc: number;
  monthly_click_mobile: number;
  ctr_pc: number;
  ctr_mobile: number;
  ad_count: number;
  comp_idx: string;
  blog_count?: number;
  news_count?: number;
  webkr_count?: number;
  cafe_count?: number;
  raw_json: string;
  fetched_at: string;
}

export class NaverKeywordAPI {
  private baseUrl: string;
  private apiKey: string;
  private secret: string;
  private customerId: string;

  constructor() {
    this.baseUrl = process.env.SEARCHAD_BASE || 'https://api.naver.com';
    this.apiKey = process.env.SEARCHAD_API_KEY || '';
    this.secret = process.env.SEARCHAD_SECRET || '';
    this.customerId = process.env.SEARCHAD_CUSTOMER_ID || '';
  }

  private generateSignature(timestamp: string, method: string, uri: string): string {
    const message = `${timestamp}.${method}.${uri}`;
    const signature = CryptoJS.HmacSHA256(message, this.secret);
    return CryptoJS.enc.Base64.stringify(signature);
  }

  private normalizeNumber(value: any): number {
    // null, undefined, 빈 문자열 체크
    if (value === null || value === undefined || value === '') return 0;
    
    // 문자열로 변환
    const stringValue = String(value);
    
    // "< 10" 같은 문자열 처리
    if (stringValue.includes('<')) {
      const match = stringValue.match(/< (\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    
    // 숫자만 추출
    const numericValue = stringValue.replace(/[^\d.-]/g, '');
    return parseFloat(numericValue) || 0;
  }

  private processKeywordData(data: NaverKeywordData): ProcessedKeywordData {
    // 데이터 유효성 검증
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid keyword data received from API');
    }

    const pcSearch = this.normalizeNumber(data.monthlyPcQcCnt);
    const mobileSearch = this.normalizeNumber(data.monthlyMobileQcCnt);
    const totalSearch = pcSearch + mobileSearch;

    return {
      keyword: data.relKeyword || '',
      pc_search: pcSearch,
      mobile_search: mobileSearch,
      total_search: totalSearch,
      monthly_click_pc: this.normalizeNumber(data.monthlyAvePcClkCnt),
      monthly_click_mobile: this.normalizeNumber(data.monthlyAveMobileClkCnt),
      ctr_pc: this.normalizeNumber(data.monthlyAvePcCtr),
      ctr_mobile: this.normalizeNumber(data.monthlyAveMobileCtr),
      ad_count: this.normalizeNumber(data.plAvgDepth),
      comp_idx: data.compIdx || 'UNKNOWN',
      raw_json: JSON.stringify(data),
      fetched_at: new Date().toISOString(),
    };
  }

  async getKeywords(hintKeywords: string[], showDetail: boolean = true): Promise<ProcessedKeywordData[]> {
    if (hintKeywords.length === 0) {
      throw new Error('최소 1개의 힌트 키워드가 필요합니다.');
    }

    if (hintKeywords.length > 5) {
      throw new Error('최대 5개의 힌트 키워드만 허용됩니다.');
    }

    const timestamp = Date.now().toString();
    const method = 'GET';
    const uri = '/keywordstool';
    const signature = this.generateSignature(timestamp, method, uri);

    const params = new URLSearchParams({
      hintKeywords: hintKeywords.join(','),
      showDetail: showDetail ? '1' : '0',
    });

    const url = `${this.baseUrl}${uri}?${params.toString()}`;

    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Timestamp': timestamp,
      'X-API-KEY': this.apiKey,
      'X-Customer': this.customerId,
      'X-Signature': signature,
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (response.status === 429) {
        throw new Error('API 호출 한도 초과. 잠시 후 다시 시도해주세요.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 요청 실패: ${response.status} - ${errorText}`);
      }

      const data: NaverApiResponse = await response.json();
      
      if (!data || !data.keywordList || !Array.isArray(data.keywordList)) {
        console.warn('Invalid API response structure:', data);
        return [];
      }

      return data.keywordList
        .filter(item => item && typeof item === 'object') // 유효한 데이터만 필터링
        .map(item => {
          try {
            return this.processKeywordData(item);
          } catch (error) {
            console.error('Error processing keyword data:', error, item);
            return null;
          }
        })
        .filter(item => item !== null) as ProcessedKeywordData[]; // null 값 제거
    } catch (error) {
      console.error('네이버 API 호출 오류:', error);
      throw error;
    }
  }

  async getKeywordsBatch(keywords: string[], showDetail: boolean = true): Promise<ProcessedKeywordData[]> {
    const results: ProcessedKeywordData[] = [];
    const batchSize = 5;

    // 5개씩 배치로 나누어 처리
    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.getKeywords(batch, showDetail);
        results.push(...batchResults);
        
        // RelKwdStat는 속도 제한이 엄격하므로 지연 추가
        if (i + batchSize < keywords.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
        }
      } catch (error) {
        console.error(`배치 ${i / batchSize + 1} 처리 중 오류:`, error);
        
        // 429 오류 시 더 긴 대기
        if (error instanceof Error && error.message.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, 300000)); // 5분 대기
        }
      }
    }

    return results;
  }

  // 시드키워드로부터 연관키워드 목록 가져오기 (상세 정보 없이)
  async getRelatedKeywords(seedKeyword: string): Promise<string[]> {
    try {
      // 1차: 기본 연관키워드 수집
      const primaryKeywords = await this.getKeywords([seedKeyword], false);
      let allKeywords = primaryKeywords.map(k => k.keyword);
      
      console.log(`1차 수집: ${allKeywords.length}개 키워드`);
      
      // 2차: 수집된 키워드들을 다시 힌트로 사용하여 추가 키워드 수집
      if (allKeywords.length > 0) {
        const batchSize = 5; // API 제한에 맞춰 5개씩 처리
        const additionalKeywords = new Set<string>();
        
        // 기존 키워드들을 5개씩 묶어서 추가 수집
        for (let i = 0; i < Math.min(allKeywords.length, 10); i += batchSize) {
          const batch = allKeywords.slice(i, i + batchSize);
          
          try {
            const batchKeywords = await this.getKeywords(batch, false);
            batchKeywords.forEach(k => {
              if (k.keyword !== seedKeyword && !allKeywords.includes(k.keyword)) {
                additionalKeywords.add(k.keyword);
              }
            });
            
            // API 제한을 고려한 대기
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`배치 ${i}-${i + batchSize} 수집 실패:`, error);
          }
        }
        
        allKeywords = [...allKeywords, ...Array.from(additionalKeywords)];
        console.log(`2차 수집 후 총 ${allKeywords.length}개 키워드`);
      }
      
      // 3차: 특정 패턴으로 추가 키워드 생성 (맛집 관련)
      if (seedKeyword.includes('맛집') || seedKeyword.includes('음식')) {
        const locationKeywords = [
          '강남', '홍대', '신촌', '이태원', '명동', '동대문', '건대', '성수', '압구정', '청담',
          '잠실', '송파', '강동', '마포', '서초', '용산', '중구', '종로', '성북', '노원',
          '은평', '서대문', '동대문구', '성동', '광진', '중랑', '강북', '도봉', '관악', '금천',
          '영등포', '양천', '구로', '금천', '동작', '강서', '양천', '서초', '강남구', '송파구'
        ];
        
        const additionalPatterns = [];
        for (const location of locationKeywords.slice(0, 10)) { // 상위 10개 지역만
          if (!allKeywords.includes(`${location}맛집`)) {
            additionalPatterns.push(`${location}맛집`);
          }
          if (!allKeywords.includes(`${location}역맛집`)) {
            additionalPatterns.push(`${location}역맛집`);
          }
        }
        
        allKeywords = [...allKeywords, ...additionalPatterns];
        console.log(`3차 패턴 생성 후 총 ${allKeywords.length}개 키워드`);
      }
      
      return allKeywords;
    } catch (error) {
      console.error('연관키워드 조회 실패:', error);
      return [];
    }
  }

  // 특정 키워드의 상세 통계 정보 가져오기
  async getKeywordStats(keyword: string): Promise<ProcessedKeywordData | null> {
    try {
      const results = await this.getKeywords([keyword], true);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`키워드 "${keyword}" 통계 조회 실패:`, error);
      return null;
    }
  }
}

export const naverAPI = new NaverKeywordAPI();
