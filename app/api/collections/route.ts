import { NextRequest, NextResponse } from 'next/server'
import { keywordDB } from '@/lib/supabase'

export async function GET() {
  try {
    const collections = await keywordDB.getCollections()
    return NextResponse.json(collections)
  } catch (error: any) {
    console.error('수집 세션 목록 조회 오류:', error)
    return NextResponse.json(
      { 
        message: '수집 세션 목록을 불러오는데 실패했습니다.',
        error: error?.message || String(error),
        details: error?.details || null
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, seedKeywords } = body

    if (!name || !seedKeywords || seedKeywords.length === 0) {
      return NextResponse.json(
        { message: '이름과 시드키워드는 필수입니다.' },
        { status: 400 }
      )
    }

    if (seedKeywords.length > 20) {
      return NextResponse.json(
        { message: '최대 20개의 시드키워드만 허용됩니다.' },
        { status: 400 }
      )
    }

    const collection = await keywordDB.createCollection(name, description || '', seedKeywords)
    return NextResponse.json(collection)
  } catch (error: any) {
    console.error('수집 세션 생성 오류:', error)
    return NextResponse.json(
      { 
        message: '수집 세션 생성에 실패했습니다.',
        error: error?.message || String(error),
        details: error?.details || null
      },
      { status: 500 }
    )
  }
}
