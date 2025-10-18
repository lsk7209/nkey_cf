import { NextRequest, NextResponse } from 'next/server'
import { NaverKeywordAPI } from '@/lib/naver-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seedKeyword } = body

    if (!seedKeyword || typeof seedKeyword !== 'string') {
      return NextResponse.json(
        { message: '시드키워드가 필요합니다.' },
        { status: 400 }
      )
    }

    // 네이버 API 인스턴스 생성
    const naverAPI = new NaverKeywordAPI()

    // 시드키워드로 연관키워드 수집
    const relatedKeywords = await naverAPI.getRelatedKeywords(seedKeyword)
    
    if (relatedKeywords.length === 0) {
      return NextResponse.json(
        { 
          message: '연관키워드를 찾을 수 없습니다.',
          keywords: []
        },
        { status: 200 }
      )
    }

    // 각 연관키워드의 상세 정보 수집
    const keywordDetails = []
    
    for (const keyword of relatedKeywords) {
      try {
        const details = await naverAPI.getKeywordStats(keyword)
        if (details) {
          keywordDetails.push(details)
        }
        
        // API 제한을 고려한 대기 (429 에러 방지)
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`키워드 "${keyword}" 상세 정보 수집 실패:`, error)
        // 개별 키워드 실패는 전체를 중단하지 않음
      }
    }

    return NextResponse.json({
      message: '수집 완료',
      seedKeyword,
      keywords: keywordDetails
    })

  } catch (error: any) {
    console.error('수동수집 오류:', error)
    
    // 네이버 API 관련 에러 처리
    if (error.message?.includes('429')) {
      return NextResponse.json(
        { 
          message: 'API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.',
          error: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return NextResponse.json(
        { 
          message: '네이버 API 인증에 실패했습니다. API 키를 확인해주세요.',
          error: 'AUTHENTICATION_FAILED'
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        message: '키워드 수집에 실패했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
