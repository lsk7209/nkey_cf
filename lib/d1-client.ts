// D1 데이터베이스 클라이언트 (Cloudflare D1용)
export class D1Client {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // 수동수집 결과 저장
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

  // 중복 키워드 필터링
  async filterDuplicateKeywords(keywords: string[]): Promise<string[]> {
    if (keywords.length === 0) return [];

    try {
      const placeholders = keywords.map(() => '?').join(',');
      const query = `SELECT keyword FROM manual_collection_results WHERE keyword IN (${placeholders})`;
      const { results } = await this.db.prepare(query).bind(...keywords).all();
      
      const existingKeywords = new Set(results.map((r: any) => r.keyword));
      return keywords.filter(keyword => !existingKeywords.has(keyword));
    } catch (error) {
      console.error('중복 키워드 필터링 오류:', error);
      return keywords; // 오류 시 모든 키워드 반환
    }
  }

  // 자동수집3 상태 업데이트
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

  // 자동수집3 상태 조회
  async getAutoCollect3Status() {
    try {
      const { results } = await this.db.prepare('SELECT * FROM auto_collect3_status WHERE id = 1').all();
      return results[0] || null;
    } catch (error) {
      console.error('자동수집3 상태 조회 실패:', error);
      return null;
    }
  }

  // 시드키워드 조회 (자동수집3용)
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

  // 키워드 데이터 조회 (데이터 페이지용)
  async getKeywordsData(filters: any, pagination: any) {
    try {
      let query = 'SELECT * FROM manual_collection_results WHERE 1=1';
      const params: any[] = [];

      // 필터 적용
      if (filters.search) {
        query += ' AND keyword LIKE ?';
        params.push(`%${filters.search}%`);
      }

      if (filters.seedKeyword) {
        query += ' AND seed_keyword = ?';
        params.push(filters.seedKeyword);
      }

      if (filters.totalSearchMin) {
        query += ' AND total_search >= ?';
        params.push(parseInt(filters.totalSearchMin));
      }

      if (filters.totalSearchMax) {
        query += ' AND total_search <= ?';
        params.push(parseInt(filters.totalSearchMax));
      }

      // 정렬
      const sortBy = filters.sortBy || 'cafe_count';
      const sortOrder = filters.sortOrder || 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // 페이지네이션
      const offset = (pagination.page - 1) * pagination.limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(pagination.limit, offset);

      const { results } = await this.db.prepare(query).bind(...params).all();
      
      // 총 개수 조회
      let countQuery = 'SELECT COUNT(*) as total FROM manual_collection_results WHERE 1=1';
      const countParams: any[] = [];
      
      if (filters.search) {
        countQuery += ' AND keyword LIKE ?';
        countParams.push(`%${filters.search}%`);
      }

      if (filters.seedKeyword) {
        countQuery += ' AND seed_keyword = ?';
        countParams.push(filters.seedKeyword);
      }

      if (filters.totalSearchMin) {
        countQuery += ' AND total_search >= ?';
        countParams.push(parseInt(filters.totalSearchMin));
      }

      if (filters.totalSearchMax) {
        countQuery += ' AND total_search <= ?';
        countParams.push(parseInt(filters.totalSearchMax));
      }

      const { results: countResults } = await this.db.prepare(countQuery).bind(...countParams).all();
      const total = countResults[0]?.total || 0;

      return {
        data: results || [],
        pagination: {
          ...pagination,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: pagination.page * pagination.limit < total,
          hasPrev: pagination.page > 1
        }
      };
    } catch (error) {
      console.error('키워드 데이터 조회 실패:', error);
      return { data: [], pagination: { ...pagination, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    }
  }

  // 시드키워드 목록 조회
  async getSeedKeywords() {
    try {
      const { results } = await this.db.prepare(`
        SELECT DISTINCT seed_keyword 
        FROM manual_collection_results 
        ORDER BY seed_keyword
      `).all();
      
      return results.map((r: any) => r.seed_keyword);
    } catch (error) {
      console.error('시드키워드 목록 조회 실패:', error);
      return [];
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
