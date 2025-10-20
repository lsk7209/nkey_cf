import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'cafe_count'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const seedKeyword = searchParams.get('seedKeyword') || ''
    
    // 범위 필터 파라미터
    const totalSearchMin = searchParams.get('totalSearchMin')
    const totalSearchMax = searchParams.get('totalSearchMax')
    const cafeCountMin = searchParams.get('cafeCountMin')
    const cafeCountMax = searchParams.get('cafeCountMax')
    const blogCountMin = searchParams.get('blogCountMin')
    const blogCountMax = searchParams.get('blogCountMax')
    const newsCountMin = searchParams.get('newsCountMin')
    const newsCountMax = searchParams.get('newsCountMax')
    const webkrCountMin = searchParams.get('webkrCountMin')
    const webkrCountMax = searchParams.get('webkrCountMax')

    // 디버깅: 필터 파라미터 로깅
    console.log('🔍 필터 파라미터:', {
      totalSearchMin,
      totalSearchMax,
      cafeCountMin,
      cafeCountMax,
      blogCountMin,
      blogCountMax,
      newsCountMin,
      newsCountMax,
      webkrCountMin,
      webkrCountMax
    })

    // 페이지네이션 계산
    const offset = (page - 1) * limit

    // 쿼리 빌더 시작
    let query = supabase
      .from('manual_collection_results')
      .select('*', { count: 'exact' })

    // 검색 조건 추가
    if (search) {
      query = query.ilike('keyword', `%${search}%`)
    }

    // 시드키워드 필터 추가
    if (seedKeyword) {
      query = query.eq('seed_keyword', seedKeyword)
    }

    // 범위 필터 추가
    if (totalSearchMin) {
      query = query.gte('total_search', parseInt(totalSearchMin))
    }
    if (totalSearchMax) {
      query = query.lte('total_search', parseInt(totalSearchMax))
    }
    if (cafeCountMin) {
      query = query.gte('cafe_count', parseInt(cafeCountMin))
    }
    if (cafeCountMax) {
      query = query.lte('cafe_count', parseInt(cafeCountMax))
    }
    if (blogCountMin) {
      query = query.gte('blog_count', parseInt(blogCountMin))
    }
    if (blogCountMax) {
      query = query.lte('blog_count', parseInt(blogCountMax))
    }
    if (newsCountMin) {
      query = query.gte('news_count', parseInt(newsCountMin))
    }
    if (newsCountMax) {
      query = query.lte('news_count', parseInt(newsCountMax))
    }
    if (webkrCountMin) {
      query = query.gte('webkr_count', parseInt(webkrCountMin))
    }
    if (webkrCountMax) {
      query = query.lte('webkr_count', parseInt(webkrCountMax))
    }

    // 정렬 추가
    const validSortColumns = ['total_search', 'pc_search', 'mobile_search', 'created_at', 'keyword', 'cafe_count', 'blog_count', 'news_count', 'webkr_count']
    const validSortOrders = ['asc', 'desc']
    
    if (validSortColumns.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('cafe_count', { ascending: true })
    }

    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('데이터 조회 오류:', error)
      return NextResponse.json(
        { 
          message: '데이터를 불러오는데 실패했습니다.',
          error: error.message
        },
        { status: 500 }
      )
    }

    // 디버깅: 필터링 결과 로깅
    console.log('📊 필터링 결과:', {
      totalCount: count,
      returnedData: data?.length || 0,
      sampleData: data?.slice(0, 3).map((item: any) => ({
        keyword: item.keyword,
        total_search: item.total_search,
        cafe_count: item.cafe_count
      }))
    })

    // 총 페이지 수 계산
    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        search,
        seedKeyword,
        sortBy,
        sortOrder
      }
    })

  } catch (error: any) {
    console.error('데이터 API 오류:', error)
    return NextResponse.json(
      { 
        message: '서버 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}

// 시드키워드 목록 조회
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'getSeedKeywords') {
      const { data, error } = await supabase
        .from('manual_collection_results')
        .select('seed_keyword')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('시드키워드 조회 오류:', error)
        return NextResponse.json(
          { message: '시드키워드 목록을 불러오는데 실패했습니다.' },
          { status: 500 }
        )
      }

      // 중복 제거
      const uniqueSeedKeywords = Array.from(new Set(data?.map(item => item.seed_keyword) || []))

      return NextResponse.json({
        seedKeywords: uniqueSeedKeywords
      })
    }

    return NextResponse.json(
      { message: '잘못된 요청입니다.' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('데이터 API POST 오류:', error)
    return NextResponse.json(
      { 
        message: '서버 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
