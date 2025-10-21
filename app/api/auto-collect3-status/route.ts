import { NextResponse } from 'next/server'
import { D1Client } from '@/lib/d1-client'

export const runtime = 'edge'

export async function GET(request: NextRequest, { params }: { params: any }) {
  try {
    const d1Client = new D1Client(params.env.DB)
    
    // 자동수집3 상태 조회
    const autoCollect3Status = await d1Client.getAutoCollect3Status()

    return NextResponse.json(autoCollect3Status || {
      is_running: false,
      current_seed: null,
      seeds_processed: 0,
      total_seeds: 0,
      keywords_collected: 0,
      start_time: null,
      end_time: null,
      status_message: '대기 중',
      error_message: null
    })

  } catch (error: any) {
    console.error('자동수집3 상태 조회 오류:', error)
    return NextResponse.json(
      {
        message: '자동수집3 상태를 불러오는데 실패했습니다.',
        error: (error as any)?.message || String(error)
      },
      { status: 500 }
    )
  }
}
