import { NextRequest, NextResponse } from 'next/server'
import { NaverDocumentAPI } from '@/lib/naver-document-api'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keywordId } = body

    if (!keywordId) {
      return NextResponse.json(
        { message: '키워드 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 특정 키워드 데이터 조회
    const { data: keywordData, error: fetchError } = await supabase
      .from('manual_collection_results')
      .select('*')
      .eq('id', keywordId)
      .single()

    if (fetchError || !keywordData) {
      return NextResponse.json(
        { message: '키워드 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 문서수 수집
    const documentAPI = new NaverDocumentAPI()
    const documentCounts = await documentAPI.getDocumentCounts(keywordData.keyword)

    // 데이터베이스 업데이트
    const { error: updateError } = await supabase
      .from('manual_collection_results')
      .update({
        blog_count: documentCounts.blog,
        news_count: documentCounts.news,
        webkr_count: documentCounts.webkr,
        cafe_count: documentCounts.cafe
      })
      .eq('id', keywordId)

    if (updateError) {
      console.error('문서수 업데이트 오류:', updateError)
      return NextResponse.json(
        { message: '문서수 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '문서수 업데이트 완료',
      keyword: keywordData.keyword,
      documentCounts
    })

  } catch (error: any) {
    console.error('문서수 업데이트 오류:', error)
    return NextResponse.json(
      { 
        message: '서버 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}

// 모든 키워드의 문서수를 일괄 업데이트
export async function PUT(request: NextRequest) {
  try {
    const documentAPI = new NaverDocumentAPI()
    
    // 문서수가 0인 모든 키워드 조회
    const { data: keywords, error: fetchError } = await supabase
      .from('manual_collection_results')
      .select('id, keyword')
      .or('blog_count.is.null,blog_count.eq.0,news_count.is.null,news_count.eq.0,webkr_count.is.null,webkr_count.eq.0,cafe_count.is.null,cafe_count.eq.0')

    if (fetchError) {
      console.error('키워드 조회 오류:', fetchError)
      return NextResponse.json(
        { message: '키워드 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({
        message: '업데이트할 키워드가 없습니다.',
        updatedCount: 0
      })
    }

    let updatedCount = 0
    const errors = []

    // 각 키워드의 문서수 수집 및 업데이트
    for (const keyword of keywords) {
      try {
        const documentCounts = await documentAPI.getDocumentCounts(keyword.keyword)
        
        const { error: updateError } = await supabase
          .from('manual_collection_results')
          .update({
            blog_count: documentCounts.blog,
            news_count: documentCounts.news,
            webkr_count: documentCounts.webkr,
            cafe_count: documentCounts.cafe
          })
          .eq('id', keyword.id)

        if (updateError) {
          console.error(`키워드 "${keyword.keyword}" 업데이트 오류:`, updateError)
          errors.push({ keyword: keyword.keyword, error: updateError.message })
        } else {
          updatedCount++
        }

        // API 제한을 고려한 대기
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`키워드 "${keyword.keyword}" 문서수 수집 실패:`, error)
        errors.push({ keyword: keyword.keyword, error: String(error) })
      }
    }

    return NextResponse.json({
      message: '문서수 일괄 업데이트 완료',
      totalKeywords: keywords.length,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('문서수 일괄 업데이트 오류:', error)
    return NextResponse.json(
      { 
        message: '서버 오류가 발생했습니다.',
        error: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
