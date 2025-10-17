import { NextRequest, NextResponse } from 'next/server'
import { keywordDB } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    const collections = await keywordDB.getCollections()
    const collection = collections.find(c => c.id === collectionId)

    if (!collection) {
      return NextResponse.json(
        { message: '수집 세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(collection)
  } catch (error) {
    console.error('수집 세션 조회 오류:', error)
    return NextResponse.json(
      { message: '수집 세션을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    await keywordDB.deleteCollection(collectionId)
    return NextResponse.json({ message: '수집 세션이 삭제되었습니다.' })
  } catch (error) {
    console.error('수집 세션 삭제 오류:', error)
    return NextResponse.json(
      { message: '수집 세션 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
