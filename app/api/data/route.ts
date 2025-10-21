import { NextRequest, NextResponse } from 'next/server'
import { D1Client } from '@/lib/d1-client'
import { DataFilters } from '@/types'

export const runtime = 'edge'

export async function GET(request: NextRequest, { params }: { params: any }) {
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

    const d1Client = new D1Client(params.env.DB)

    // 필터 객체 생성
    const filters = {
      search,
      seedKeyword,
      sortBy,
      sortOrder,
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
    }

    // 페이지네이션 객체 생성
    const pagination = { page, limit }

    // D1에서 데이터 조회
    const result = await d1Client.getKeywordsData(filters, pagination)

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
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
export async function POST(request: NextRequest, { params }: { params: any }) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'getSeedKeywords') {
      const d1Client = new D1Client(params.env.DB)
      const seedKeywords = await d1Client.getSeedKeywords()

      return NextResponse.json({
        seedKeywords
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
