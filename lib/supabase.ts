import { createClient } from '@supabase/supabase-js';
import { ProcessedKeywordData } from './naver-api';

// 환경변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 빌드 시에는 더미 클라이언트를 생성하여 에러 방지
let supabaseClient: any = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here') {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    });
  } catch (error) {
    console.warn('Supabase 클라이언트 생성 실패:', error);
  }
}

export const supabase = supabaseClient;

export interface KeywordCollection {
  id: string;
  name: string;
  description?: string;
  seed_keywords: string[];
  status: 'pending' | 'collecting' | 'completed' | 'failed';
  total_keywords: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface KeywordData {
  id: string;
  collection_id: string;
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
  raw_json: string;
  fetched_at: string;
  created_at: string;
}

export class KeywordDatabase {
  // 키워드 수집 세션 생성
  async createCollection(name: string, description: string, seedKeywords: string[]): Promise<KeywordCollection> {
    const { data, error } = await supabase
      .from('keyword_collections')
      .insert({
        name,
        description,
        seed_keywords: seedKeywords,
        status: 'pending',
        total_keywords: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`수집 세션 생성 실패: ${error.message}`);
    }

    return data;
  }

  // 키워드 데이터 저장
  async saveKeywords(collectionId: string, keywords: ProcessedKeywordData[]): Promise<void> {
    const keywordData = keywords.map(keyword => ({
      collection_id: collectionId,
      keyword: keyword.keyword,
      pc_search: keyword.pc_search,
      mobile_search: keyword.mobile_search,
      total_search: keyword.total_search,
      monthly_click_pc: keyword.monthly_click_pc,
      monthly_click_mobile: keyword.monthly_click_mobile,
      ctr_pc: keyword.ctr_pc,
      ctr_mobile: keyword.ctr_mobile,
      ad_count: keyword.ad_count,
      comp_idx: keyword.comp_idx,
      raw_json: keyword.raw_json,
      fetched_at: keyword.fetched_at,
    }));

    const { error } = await supabase
      .from('keywords')
      .insert(keywordData);

    if (error) {
      throw new Error(`키워드 저장 실패: ${error.message}`);
    }

    // 수집 세션의 총 키워드 수 업데이트
    await this.updateCollectionStats(collectionId);
  }

  // 수집 세션 상태 업데이트
  async updateCollectionStatus(collectionId: string, status: KeywordCollection['status']): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('keyword_collections')
      .update(updateData)
      .eq('id', collectionId);

    if (error) {
      throw new Error(`수집 세션 상태 업데이트 실패: ${error.message}`);
    }
  }

  // 수집 세션 통계 업데이트
  async updateCollectionStats(collectionId: string): Promise<void> {
    const { count, error } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    if (error) {
      throw new Error(`통계 조회 실패: ${error.message}`);
    }

    const { error: updateError } = await supabase
      .from('keyword_collections')
      .update({
        total_keywords: count || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', collectionId);

    if (updateError) {
      throw new Error(`통계 업데이트 실패: ${updateError.message}`);
    }
  }

  // 수집 세션 목록 조회
  async getCollections(): Promise<KeywordCollection[]> {
    const { data, error } = await supabase
      .from('keyword_collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`수집 세션 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  // 특정 수집 세션의 키워드 조회
  async getKeywordsByCollection(collectionId: string): Promise<KeywordData[]> {
    const { data, error } = await supabase
      .from('keywords')
      .select('*')
      .eq('collection_id', collectionId)
      .order('total_search', { ascending: false });

    if (error) {
      throw new Error(`키워드 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  // 수집 세션 삭제
  async deleteCollection(collectionId: string): Promise<void> {
    // 먼저 관련 키워드 삭제
    const { error: keywordsError } = await supabase
      .from('keywords')
      .delete()
      .eq('collection_id', collectionId);

    if (keywordsError) {
      throw new Error(`키워드 삭제 실패: ${keywordsError.message}`);
    }

    // 수집 세션 삭제
    const { error: collectionError } = await supabase
      .from('keyword_collections')
      .delete()
      .eq('id', collectionId);

    if (collectionError) {
      throw new Error(`수집 세션 삭제 실패: ${collectionError.message}`);
    }
  }
}

export const keywordDB = new KeywordDatabase();
