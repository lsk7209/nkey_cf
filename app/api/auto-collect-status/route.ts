import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 자동수집 설정 조회
    const autoCollectSettings = {
      enabled: false,
      targetCount: 1000
    }

    // 시드키워드로 활용 가능한 키워드 수 조회
    const { count: availableSeeds, error: seedsError } = await supabase
      .from('manual_collection_results')
      .select('*', { count: 'exact', head: true })
      .eq('is_used_as_seed', false)

    if (seedsError) {
      console.error('시드키워드 수 조회 오류:', seedsError)
    }

    // 전체 키워드 수 조회
    const { count: totalKeywords, error: totalError } = await supabase
      .from('manual_collection_results')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('전체 키워드 수 조회 오류:', totalError)
    }

    // 시드키워드로 활용된 키워드 수 조회
    const { count: usedSeeds, error: usedError } = await supabase
      .from('manual_collection_results')
      .select('*', { count: 'exact', head: true })
      .eq('is_used_as_seed', true)

    if (usedError) {
      console.error('활용된 시드키워드 수 조회 오류:', usedError)
    }

    return NextResponse.json({
      settings: autoCollectSettings,
      statistics: {
        totalKeywords: totalKeywords || 0,
        availableSeeds: availableSeeds || 0,
        usedSeeds: usedSeeds || 0,
        usageRate: totalKeywords && totalKeywords > 0 
          ? ((usedSeeds || 0) / totalKeywords * 100).toFixed(1) 
          : '0.0'
      }
    })

  } catch (error: any) {
    console.error('자동수집 상태 조회 오류:', error)
    return NextResponse.json(
      {
        message: '자동수집 상태 조회에 실패했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
