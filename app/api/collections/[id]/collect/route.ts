import { NextRequest, NextResponse } from 'next/server'
import { keywordDB } from '@/lib/supabase'
import { naverAPI } from '@/lib/naver-api'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    
    // 수집 세션 정보 조회
    const collections = await keywordDB.getCollections()
    const collection = collections.find(c => c.id === collectionId)

    if (!collection) {
      return NextResponse.json(
        { message: '수집 세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (collection.status === 'collecting') {
      return NextResponse.json(
        { message: '이미 수집이 진행 중입니다.' },
        { status: 400 }
      )
    }

    if (collection.status === 'completed') {
      return NextResponse.json(
        { message: '이미 수집이 완료되었습니다.' },
        { status: 400 }
      )
    }

    // 수집 상태를 'collecting'으로 변경
    await keywordDB.updateCollectionStatus(collectionId, 'collecting')

    // 백그라운드에서 키워드 수집 시작
    collectKeywordsInBackground(collectionId, collection.seed_keywords)

    return NextResponse.json({ message: '키워드 수집이 시작되었습니다.' })
  } catch (error) {
    console.error('키워드 수집 시작 오류:', error)
    return NextResponse.json(
      { message: '키워드 수집을 시작하는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

async function collectKeywordsInBackground(collectionId: string, seedKeywords: string[]) {
  try {
    console.log(`키워드 수집 시작: ${collectionId}`)
    
    // 네이버 API를 통해 키워드 수집
    const keywords = await naverAPI.getKeywordsBatch(seedKeywords, true)
    
    if (keywords.length > 0) {
      // 수집된 키워드를 데이터베이스에 저장
      await keywordDB.saveKeywords(collectionId, keywords)
      console.log(`${keywords.length}개의 키워드가 수집되었습니다.`)
    }

    // 수집 완료 상태로 변경
    await keywordDB.updateCollectionStatus(collectionId, 'completed')
    console.log(`키워드 수집 완료: ${collectionId}`)
    
  } catch (error) {
    console.error('키워드 수집 중 오류:', error)
    
    // 수집 실패 상태로 변경
    try {
      await keywordDB.updateCollectionStatus(collectionId, 'failed')
    } catch (updateError) {
      console.error('상태 업데이트 실패:', updateError)
    }
  }
}
