import { NextResponse } from 'next/server'
import { NaverKeywordAPI } from '@/lib/naver-api'

export async function GET() {
  try {
    const naverAPI = new NaverKeywordAPI()
    
    const apiKeyStatus = naverAPI.getApiKeyStatus()
    const totalRemainingCalls = naverAPI.getTotalRemainingCalls()
    
    return NextResponse.json({
      apiKeyStatus,
      totalRemainingCalls,
      message: 'API 키 상태 조회 완료'
    })
  } catch (error: any) {
    console.error('API 키 상태 조회 오류:', error)
    return NextResponse.json(
      { 
        message: 'API 키 상태 조회에 실패했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
