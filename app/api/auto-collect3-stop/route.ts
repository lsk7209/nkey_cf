import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const { error } = await supabase
      .from('auto_collect3_status')
      .update({
        is_running: false,
        end_time: new Date().toISOString(),
        status_message: '사용자에 의해 자동수집3이 중단되었습니다.',
        error_message: null
      })
      .eq('id', 1)

    if (error) {
      console.error('자동수집3 중단 실패:', error)
      return NextResponse.json(
        { message: '자동수집3 중단에 실패했습니다.', error: error.message },
        { status: 500 }
      )
    }

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
