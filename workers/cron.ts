// Cron Worker: 매 정시 실행 (09-20시 사이 12회 포스팅)


// Cloudflare Workers 타입 정의
interface ScheduledEvent {
  type: 'scheduled';
  scheduledTime: number;
  cron: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    
    // 09-20시 사이에만 실행
    if (hour < 9 || hour > 20) {
      console.log(`⏰ 현재 시간 ${hour}시 - 실행 시간이 아님 (09-20시 사이만 실행)`);
      return;
    }

    console.log(`🚀 Cron Worker 실행: ${now.toISOString()}`);

    try {
      // 지터 추가 (0-30초 랜덤 지연)
      const jitter = Math.floor(Math.random() * 30000);
      await new Promise(resolve => setTimeout(resolve, jitter));
      
      console.log(`⏱️ 지터 지연: ${jitter}ms`);

      // 자동수집3 실행
      await executeAutoCollect3(env);

    } catch (error: any) {
      console.error('❌ Cron Worker 실행 오류:', error);
      
      // Slack 알림 (실패 시)
      if (env.SLACK_WEBHOOK_URL) {
        await sendSlackNotification(env.SLACK_WEBHOOK_URL, {
          text: `🚨 자동수집3 Cron 실행 실패`,
          attachments: [{
            color: 'danger',
            fields: [{
              title: '오류 메시지',
              value: error.message || String(error),
              short: false
            }, {
              title: '실행 시간',
              value: now.toISOString(),
              short: true
            }]
          }]
        });
      }
    }
  }
};

// 자동수집3 실행 함수
async function executeAutoCollect3(env: any) {
  const d1Client = new D1Client(env.DB);
  
  // 기존 자동수집3이 실행 중인지 확인
  const existingStatus = await d1Client.getAutoCollect3Status();
  
  if (existingStatus?.is_running) {
    console.log('⏸️ 자동수집3이 이미 실행 중 - 건너뜀');
    return;
  }

  // 자동수집3 설정 (Cron용 기본값)
  const seedCount = 5; // Cron에서는 적은 수로 실행
  const keywordsPerSeed = 200;

  console.log(`🌱 자동수집3 시작: ${seedCount}개 시드키워드, 시드당 ${keywordsPerSeed}개`);

  // 상태 업데이트
  await d1Client.updateAutoCollect3Status({
    is_running: true,
    current_seed: null,
    seeds_processed: 0,
    total_seeds: seedCount,
    keywords_collected: 0,
    start_time: new Date().toISOString(),
    end_time: null,
    status_message: 'Cron 자동수집3 시작 중...',
    error_message: null
  });

  try {
    // 시드키워드 조회
    const availableKeywords = await d1Client.getAvailableSeedKeywords(seedCount);
    
    if (!availableKeywords || availableKeywords.length === 0) {
      await d1Client.updateAutoCollect3Status({
        is_running: false,
        end_time: new Date().toISOString(),
        status_message: '시드키워드로 활용할 수 있는 키워드가 없습니다.'
      });
      return;
    }

    let totalKeywordsCollected = 0;
    let seedsProcessed = 0;

    // 시드키워드들을 순차적으로 처리
    for (let i = 0; i < availableKeywords.length; i++) {
      const seedKeyword = availableKeywords[i];
      seedsProcessed = i;
      
      console.log(`🌱 시드키워드 ${i + 1}/${availableKeywords.length}: "${seedKeyword.keyword}" 처리 시작`);
      
      // 현재 시드키워드 상태 업데이트
      await d1Client.updateAutoCollect3Status({
        current_seed: seedKeyword.keyword,
        seeds_processed: seedsProcessed,
        status_message: `"${seedKeyword.keyword}" 시드키워드 처리 중... (${i + 1}/${availableKeywords.length})`
      });

      try {
        // Naver API 호출 (간소화된 버전)
        const naverAPI = new NaverKeywordAPI();
        const documentAPI = new NaverDocumentAPI();
        
        // 연관키워드 수집
        const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword.keyword);
        
        if (relatedKeywords && relatedKeywords.length > 0) {
          // 키워드 상세 정보 수집 (배치 처리)
          const batchSize = 10;
          const batches = [];
          
          for (let j = 0; j < relatedKeywords.length; j += batchSize) {
            const batch = relatedKeywords.slice(j, j + batchSize);
            batches.push(batch);
          }

          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            
            try {
              // 키워드 상세 정보 수집
              const keywordDetails: any[] = await naverAPI.getKeywordDetails(batch);
              
              if (keywordDetails && keywordDetails.length > 0) {
                // 문서수 수집
                const docCounts: any = await documentAPI.getDocumentCounts(
                  keywordDetails.map((k: any) => k.keyword)
                );
                
                // 데이터베이스에 저장
                const insertData = keywordDetails.map(detail => ({
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
                  blog_count: docCounts[detail.keyword]?.blog || 0,
                  news_count: docCounts[detail.keyword]?.news || 0,
                  webkr_count: docCounts[detail.keyword]?.webkr || 0,
                  cafe_count: docCounts[detail.keyword]?.cafe || 0,
                  is_used_as_seed: false,
                  raw_json: detail.raw_json,
                  fetched_at: detail.fetched_at
                }));

                const result = await d1Client.saveManualCollectionResults(insertData);
                
                if (result.success) {
                  totalKeywordsCollected += result.savedCount;
                  console.log(`✅ 배치 ${batchIndex + 1} 저장 완료: ${result.savedCount}개 키워드`);
                }
              }
              
              // API 호출 간격 조절
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (batchError) {
              console.error(`❌ 배치 ${batchIndex + 1} 처리 실패:`, batchError);
            }
          }
        }
        
        // 시드키워드 사용 완료 표시
        try {
          await d1Client.markSeedAsUsed(seedKeyword.id);
          console.log(`✅ 시드키워드 "${seedKeyword.keyword}" 사용 완료 표시됨`);
        } catch (updateSeedError) {
          console.error(`시드키워드 "${seedKeyword.keyword}" 사용 표시 실패:`, updateSeedError);
        }
        
        console.log(`✅ 시드키워드 "${seedKeyword.keyword}" 처리 완료: ${totalKeywordsCollected}개 키워드 수집됨`);
        
        // 진행 상태 업데이트
        await d1Client.updateAutoCollect3Status({
          keywords_collected: totalKeywordsCollected,
          status_message: `"${seedKeyword.keyword}" 완료: ${totalKeywordsCollected}개 키워드 수집됨`
        });
        
      } catch (seedError) {
        console.error(`❌ 시드키워드 "${seedKeyword.keyword}" 처리 실패:`, seedError);
      }
    }

    // 자동수집3 완료 상태 업데이트
    await d1Client.updateAutoCollect3Status({
      is_running: false,
      end_time: new Date().toISOString(),
      current_seed: null,
      seeds_processed: seedsProcessed + 1,
      keywords_collected: totalKeywordsCollected,
      status_message: `Cron 자동수집3 완료! ${totalKeywordsCollected}개 키워드 수집됨`
    });

    console.log(`🎉 Cron 자동수집3 완료! ${totalKeywordsCollected}개 키워드 수집됨`);

    // Slack 알림 (성공 시)
    if (env.SLACK_WEBHOOK_URL) {
      await sendSlackNotification(env.SLACK_WEBHOOK_URL, {
        text: `✅ 자동수집3 Cron 실행 완료`,
        attachments: [{
          color: 'good',
          fields: [{
            title: '수집 결과',
            value: `${totalKeywordsCollected}개 키워드 수집됨`,
            short: true
          }, {
            title: '처리된 시드키워드',
            value: `${seedsProcessed + 1}개`,
            short: true
          }, {
            title: '실행 시간',
            value: new Date().toISOString(),
            short: true
          }]
        }]
      });
    }

  } catch (error: any) {
    console.error('자동수집3 실행 중 오류:', error);
    
    // 오류 상태 업데이트
    await d1Client.updateAutoCollect3Status({
      is_running: false,
      end_time: new Date().toISOString(),
      status_message: 'Cron 자동수집3 중 오류 발생',
      error_message: error?.message || String(error)
    });
    
    throw error; // 상위에서 처리하도록 재throw
  }
}

// Slack 알림 전송
async function sendSlackNotification(webhookUrl: string, payload: any) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Slack 알림 전송 실패:', response.status, response.statusText);
    } else {
      console.log('✅ Slack 알림 전송 성공');
    }
  } catch (error) {
    console.error('Slack 알림 전송 오류:', error);
  }
}

// D1 클라이언트 (간소화된 버전)
class D1Client {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async getAutoCollect3Status() {
    try {
      const { results } = await this.db.prepare('SELECT * FROM auto_collect3_status WHERE id = 1').all();
      return results[0] || null;
    } catch (error) {
      console.error('자동수집3 상태 조회 실패:', error);
      return null;
    }
  }

  async updateAutoCollect3Status(updates: any) {
    try {
      const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      const stmt = `UPDATE auto_collect3_status SET ${updateFields}, updated_at = ? WHERE id = 1`;
      await this.db.prepare(stmt).bind(...values, new Date().toISOString()).run();
    } catch (error) {
      console.error('자동수집3 상태 업데이트 실패:', error);
    }
  }

  async getAvailableSeedKeywords(limit: number) {
    try {
      const { results } = await this.db.prepare(`
        SELECT id, keyword, total_search 
        FROM manual_collection_results 
        WHERE is_used_as_seed = FALSE 
        ORDER BY total_search DESC 
        LIMIT ?
      `).bind(limit).all();
      
      return results || [];
    } catch (error) {
      console.error('시드키워드 조회 실패:', error);
      return [];
    }
  }

  async saveManualCollectionResults(data: any[]) {
    if (!data || data.length === 0) return { success: false, savedCount: 0, error: 'No data to save' };

    try {
      const stmt = `INSERT OR IGNORE INTO manual_collection_results 
        (seed_keyword, keyword, pc_search, mobile_search, total_search, 
         monthly_click_pc, monthly_click_mobile, ctr_pc, ctr_mobile, 
         ad_count, comp_idx, blog_count, news_count, webkr_count, cafe_count, 
         is_used_as_seed, raw_json, fetched_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      let savedCount = 0;
      for (const item of data) {
        const result = await this.db.prepare(stmt).bind(
          item.seed_keyword,
          item.keyword,
          item.pc_search,
          item.mobile_search,
          item.total_search,
          item.monthly_click_pc,
          item.monthly_click_mobile,
          item.ctr_pc,
          item.ctr_mobile,
          item.ad_count,
          item.comp_idx,
          item.blog_count || 0,
          item.news_count || 0,
          item.webkr_count || 0,
          item.cafe_count || 0,
          item.is_used_as_seed || false,
          item.raw_json,
          item.fetched_at,
          item.created_at || new Date().toISOString()
        ).run();

        if (result.success && result.meta.changes > 0) {
          savedCount++;
        }
      }

      return { success: true, savedCount };
    } catch (error: any) {
      console.error('D1 저장 오류:', error);
      return { success: false, savedCount: 0, error: error.message };
    }
  }

  // 시드키워드 사용 완료 표시
  async markSeedAsUsed(seedId: number) {
    try {
      await this.db.prepare(`
        UPDATE manual_collection_results 
        SET is_used_as_seed = true, updated_at = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), seedId).run();
    } catch (error) {
      console.error('시드키워드 사용 완료 표시 실패:', error);
    }
  }
}

// Naver API 클래스들 (간소화된 버전)
class NaverKeywordAPI {
  async getRelatedKeywords(keyword: string) {
    // 실제 구현에서는 네이버 API 호출
    console.log(`🔍 연관키워드 조회: ${keyword}`);
    return [];
  }

  async getKeywordDetails(keywords: string[]) {
    // 실제 구현에서는 네이버 API 호출
    console.log(`🔍 키워드 상세 조회: ${keywords.length}개`);
    return [];
  }
}

class NaverDocumentAPI {
  async getDocumentCounts(keywords: string[]) {
    // 실제 구현에서는 네이버 OpenAPI 호출
    console.log(`🔍 문서수 조회: ${keywords.length}개`);
    return {};
  }
}
