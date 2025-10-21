import { NextRequest, NextResponse } from 'next/server'
import { D1Client } from '@/lib/d1-client'

export const runtime = 'edge'

export async function POST(request: NextRequest, { params }: { params: any }) {
  try {
    const d1Client = new D1Client(params.env.DB)
    
    await d1Client.updateAutoCollect3Status({
      is_running: false,
      end_time: new Date().toISOString(),
      status_message: '사용자에 의해 자동수집3이 중단되었습니다.',
      error_message: null
    })

    return NextResponse.json({ message: '자동수집3이 중단되었습니다.' })

  } catch (error: any) {
    console.error('자동수집3 중단 API 오류:', error)
    return NextResponse.json(
      {
        message: '자동수집3 중단 중 오류가 발생했습니다.',
        error: (error as any)?.message || String(error)
      },
      { status: 500 }
    )
  }
}
