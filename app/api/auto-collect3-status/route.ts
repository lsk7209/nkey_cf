import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 자동수집3 상태 조회
    const { data: autoCollect3Status, error: statusError } = await supabase
      .from('auto_collect3_status')
      .select('*')
      .eq('id', 1)
      .single()

    if (statusError) {
      console.error('자동수집3 상태 조회 오류:', statusError)
    }

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
