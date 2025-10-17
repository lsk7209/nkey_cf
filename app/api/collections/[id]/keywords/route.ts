import { NextRequest, NextResponse } from 'next/server'
import { keywordDB } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    const keywords = await keywordDB.getKeywordsByCollection(collectionId)
    return NextResponse.json(keywords)
  } catch (error) {
    console.error('키워드 조회 오류:', error)
    return NextResponse.json(
      { message: '키워드 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
