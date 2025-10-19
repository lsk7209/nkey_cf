import CryptoJS from 'crypto-js';
import { ApiKeyManager } from './api-key-manager';

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
  private apiKeyManager: ApiKeyManager;

  constructor() {
    this.baseUrl = process.env.SEARCHAD_BASE || 'https://api.naver.com';
    this.apiKeyManager = new ApiKeyManager();
  }

  private generateSignature(timestamp: string, method: string, uri: string, secret: string): string {
    const message = `${timestamp}.${method}.${uri}`;
    const signature = CryptoJS.HmacSHA256(message, secret);
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

    // 사용 가능한 API 키 가져오기
    const apiKeyInfo = this.apiKeyManager.getAvailableApiKey();
    if (!apiKeyInfo) {
      throw new Error('사용 가능한 API 키가 없습니다.');
    }

    const timestamp = Date.now().toString();
    const method = 'GET';
    const uri = '/keywordstool';
    const signature = this.generateSignature(timestamp, method, uri, apiKeyInfo.secret);

    const params = new URLSearchParams({
      hintKeywords: hintKeywords.join(','),
      showDetail: showDetail ? '1' : '0',
    });

    const url = `${this.baseUrl}${uri}?${params.toString()}`;

    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Timestamp': timestamp,
      'X-API-KEY': apiKeyInfo.apiKey,
      'X-Customer': apiKeyInfo.customerId,
      'X-Signature': signature,
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      // API 사용량 증가
      this.apiKeyManager.incrementUsage(apiKeyInfo.id);

      if (response.status === 429) {
        // 해당 API 키 비활성화
        this.apiKeyManager.deactivateApiKey(apiKeyInfo.id);
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
      const allKeywords = new Set<string>();
      
      // 1차: 기본 연관키워드 수집
      const primaryKeywords = await this.getKeywords([seedKeyword], false);
      primaryKeywords.forEach(k => allKeywords.add(k.keyword));
      console.log(`1차 수집: ${allKeywords.size}개 키워드`);
      
      // API 키 상태 확인
      const availableKeys = this.apiKeyManager.getApiKeyStatus().filter(key => key.isActive);
      console.log(`사용 가능한 API 키: ${availableKeys.length}개`);
      
      if (availableKeys.length === 0) {
        console.warn('사용 가능한 API 키가 없어 추가 수집을 중단합니다.');
        return Array.from(allKeywords);
      }
      
      // 2차: 수집된 키워드들을 다시 힌트로 사용하여 추가 키워드 수집 (순차 처리)
      if (allKeywords.size > 0 && availableKeys.length > 0) {
        const batchSize = 5; // API 제한에 맞춰 5개씩 처리
        const keywordsArray = Array.from(allKeywords);
        const maxBatches = Math.min(Math.ceil(keywordsArray.length / batchSize), 10); // 최대 10개 배치로 제한
        
        // 순차 처리로 API 한도 보호
        for (let i = 0; i < maxBatches; i++) {
          const batch = keywordsArray.slice(i * batchSize, (i + 1) * batchSize);
          if (batch.length > 0) {
            try {
              const batchKeywords = await this.getKeywords(batch, false);
              batchKeywords.forEach(k => {
                if (k.keyword !== seedKeyword) {
                  allKeywords.add(k.keyword);
                }
              });
              console.log(`2차 배치 ${i + 1}/${maxBatches} 완료: ${allKeywords.size}개 키워드`);
              
              // API 호출 간격 조절 (300ms 대기)
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
              console.error(`2차 배치 ${i + 1} 수집 실패:`, error);
              // API 키 한도 초과 시 중단
              if (error instanceof Error && error.message.includes('한도 초과')) {
                console.warn('API 키 한도 초과로 2차 수집을 중단합니다.');
                break;
              }
            }
          }
        }
        console.log(`2차 수집 후 총 ${allKeywords.size}개 키워드`);
      }
      
      // 3차: 2차에서 수집된 키워드들로 추가 수집 (순차 처리, 더 보수적)
      if (allKeywords.size > 0 && availableKeys.length > 1) {
        const keywordsArray = Array.from(allKeywords);
        const batchSize = 5;
        const maxBatches = Math.min(Math.ceil(keywordsArray.length / batchSize), 5); // 최대 5개 배치로 제한
        
        // 순차 처리로 API 한도 보호
        for (let i = 0; i < maxBatches; i++) {
          const batch = keywordsArray.slice(i * batchSize, (i + 1) * batchSize);
          if (batch.length > 0) {
            try {
              const batchKeywords = await this.getKeywords(batch, false);
              batchKeywords.forEach(k => {
                if (k.keyword !== seedKeyword) {
                  allKeywords.add(k.keyword);
                }
              });
              console.log(`3차 배치 ${i + 1}/${maxBatches} 완료: ${allKeywords.size}개 키워드`);
              
              // API 호출 간격 조절 (500ms 대기)
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`3차 배치 ${i + 1} 수집 실패:`, error);
              // API 키 한도 초과 시 중단
              if (error instanceof Error && error.message.includes('한도 초과')) {
                console.warn('API 키 한도 초과로 3차 수집을 중단합니다.');
                break;
              }
            }
          }
        }
        console.log(`3차 수집 후 총 ${allKeywords.size}개 키워드`);
      }
      
      return Array.from(allKeywords);
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

  // 고성능 병렬 처리: 여러 키워드의 상세 통계를 동시에 수집
  async getBatchKeywordStats(
    keywords: string[], 
    maxConcurrency: number = 10,
    onProgress?: (current: number, total: number) => void
  ): Promise<ProcessedKeywordData[]> {
    const results: ProcessedKeywordData[] = [];
    const availableKeys = this.apiKeyManager.getAvailableApiKeys(maxConcurrency);
    
    if (availableKeys.length === 0) {
      console.warn('사용 가능한 API 키가 없어 배치 처리를 중단합니다.');
      return results;
    }

    console.log(`${keywords.length}개 키워드를 ${availableKeys.length}개 API 키로 병렬 처리합니다.`);

    // 키워드를 청크로 나누기
    const chunkSize = Math.ceil(keywords.length / availableKeys.length);
    const chunks = [];
    for (let i = 0; i < keywords.length; i += chunkSize) {
      chunks.push(keywords.slice(i, i + chunkSize));
    }

    // 각 API 키로 청크를 병렬 처리
    let processedCount = 0;
    const chunkPromises = chunks.map(async (chunk, index) => {
      const apiKey = availableKeys[index % availableKeys.length];
      const chunkResults: ProcessedKeywordData[] = [];

      for (const keyword of chunk) {
        try {
          const result = await this.getKeywordStatsWithKey(keyword, apiKey);
          if (result) {
            chunkResults.push(result);
          }
          
          // 진행률 업데이트
          processedCount++;
          if (onProgress) {
            onProgress(processedCount, keywords.length);
          }
          
          // API 호출 간격 조절
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`키워드 "${keyword}" 처리 실패:`, error);
          processedCount++;
          if (onProgress) {
            onProgress(processedCount, keywords.length);
          }
        }
      }

      return chunkResults;
    });

    // 모든 청크 결과를 기다리고 합치기
    const allChunkResults = await Promise.all(chunkPromises);
    allChunkResults.forEach(chunkResult => {
      results.push(...chunkResult);
    });

    console.log(`배치 처리 완료: ${results.length}개 키워드 수집됨`);
    return results;
  }

  // 특정 API 키로 키워드 통계 조회 (재시도 로직 포함)
  private async getKeywordStatsWithKey(keyword: string, apiKeyInfo: any, maxRetries: number = 3): Promise<ProcessedKeywordData | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timestamp = Date.now().toString();
        const method = 'GET';
        const uri = '/keywordstool';
        const signature = this.generateSignature(timestamp, method, uri, apiKeyInfo.secret);

        const params = new URLSearchParams({
          hintKeywords: keyword,
          showDetail: '1',
        });

        const url = `${this.baseUrl}${uri}?${params.toString()}`;

        const headers = {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Timestamp': timestamp,
          'X-API-KEY': apiKeyInfo.apiKey,
          'X-Customer': apiKeyInfo.customerId,
          'X-Signature': signature,
        };

        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        // API 사용량 증가
        this.apiKeyManager.incrementUsage(apiKeyInfo.id);

        if (response.status === 429) {
          this.apiKeyManager.deactivateApiKey(apiKeyInfo.id);
          throw new Error('API 호출 한도 초과');
        }

        if (response.status === 500 || response.status === 502 || response.status === 503) {
          // 서버 오류는 재시도
          throw new Error(`서버 오류: ${response.status}`);
        }

        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status}`);
        }

        const data: NaverApiResponse = await response.json();
        
        if (!data || !data.keywordList || !Array.isArray(data.keywordList)) {
          return null;
        }

        const validItems = data.keywordList.filter(item => item && typeof item === 'object');
        if (validItems.length === 0) {
          return null;
        }

        return this.processKeywordData(validItems[0]);
        
      } catch (error) {
        lastError = error as Error;
        
        // 429 에러나 네트워크 오류가 아닌 경우 재시도하지 않음
        if (error instanceof Error && 
            (error.message.includes('한도 초과') || 
             error.message.includes('API 요청 실패'))) {
          break;
        }
        
        // 재시도 전 대기 (지수 백오프)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`키워드 "${keyword}" ${attempt}차 시도 실패, ${delay}ms 후 재시도:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`키워드 "${keyword}" 최종 실패 (${maxRetries}회 시도):`, lastError);
    return null;
  }


  // API 키 상태 조회
  getApiKeyStatus() {
    return this.apiKeyManager.getApiKeyStatus();
  }

  // 사용 가능한 총 API 호출 수
  getTotalRemainingCalls(): number {
    return this.apiKeyManager.getTotalRemainingCalls();
  }
}

export const naverAPI = new NaverKeywordAPI();
