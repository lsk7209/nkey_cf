import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🚨 데이터베이스에서 자동수집 상태 강제 중단 시작...')
    
    // 자동수집 상태를 강제로 중단으로 변경
    const { data, error } = await supabase
      .from('auto_collect_status')
      .update({
        is_running: false,
        end_time: new Date().toISOString(),
        status_message: '데이터베이스에서 강제 중단됨',
        error_message: '사용자에 의해 강제 중단됨',
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()

    if (error) {
      console.error('❌ 데이터베이스 강제 중단 실패:', error)
      return NextResponse.json(
        { 
          message: '데이터베이스 강제 중단에 실패했습니다.',
          error: error.message 
        },
        { status: 500 }
      )
    }

    console.log('✅ 데이터베이스에서 자동수집 상태 강제 중단 완료:', data)

    return NextResponse.json({
      message: '데이터베이스에서 자동수집이 강제 중단되었습니다.',
      data: data
    })

  } catch (error: any) {
    console.error('❌ 데이터베이스 강제 중단 API 오류:', error)
    return NextResponse.json(
      {
        message: '데이터베이스 강제 중단 중 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
