import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // 자동수집 상태를 중단으로 업데이트
    const { error } = await supabase
      .from('auto_collect_status')
      .update({
        is_running: false,
        end_time: new Date().toISOString(),
        status_message: '사용자에 의해 중단됨'
      })
      .eq('id', 1)

    if (error) {
      console.error('자동수집 중단 실패:', error)
      return NextResponse.json(
        { message: '자동수집 중단에 실패했습니다.', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '자동수집이 중단되었습니다.'
    })

  } catch (error: any) {
    console.error('자동수집 중단 API 오류:', error)
    return NextResponse.json(
      {
        message: '자동수집 중단 중 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
