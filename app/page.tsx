'use client'

import { useState } from 'react'
import { Search, Database, TrendingUp, FileText, Key, Bug, XCircle } from 'lucide-react'
import KeywordTable from './components/KeywordTable'
import LoadingSpinner from './components/LoadingSpinner'

interface KeywordData {
  rel_keyword: string
  pc_search: number
  mobile_search: number
  total_search: number
  ctr_pc: number
  ctr_mo: number
  ad_count: number
  comp_idx: string
  blog_count: number
  cafe_count: number
  news_count: number
  web_count: number
  total_docs: number
  potential_score: number
  seed_usage: string
  source: 'fresh' | 'cache' | 'cooldown' | 'error'
}

interface SearchResult {
  keyword: string
  related: KeywordData[]
}

export default function Home() {
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!keywords.trim()) {
      setError('키워드를 입력해주세요.')
      return
    }

    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k)
    if (keywordList.length === 0) {
      setError('유효한 키워드를 입력해주세요.')
      return
    }

    if (keywordList.length > 5) {
      setError('최대 5개의 키워드만 입력 가능합니다.')
      return
    }

    setLoading(true)
    setError('')
    setResults([])

    try {
      // 실제 API 호출
      const results: SearchResult[] = []
      
      for (const keyword of keywordList) {
        try {
          console.log(`키워드 "${keyword}" 처리 시작`)
          
          // SearchAd API만 호출 (검색 결과 표시용)
          const searchAdResponse = await fetch('/api/searchad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: [keyword] })
          })

          console.log('SearchAd 응답 상태:', searchAdResponse.status)

          if (!searchAdResponse.ok) {
            throw new Error(`SearchAd API 오류: ${searchAdResponse.status}`)
          }

          const searchAdData = await searchAdResponse.json()
          console.log('SearchAd 데이터:', searchAdData)

          // 데이터 정규화 (네이버 API 응답 필드에 맞게 수정)
          const normalizedData = searchAdData.keywordList?.map((item: any) => {
            // 검색량 정규화 (< 10 처리)
            const pcSearchValue = item.monthlyPcQcCnt || 0
            const mobileSearchValue = item.monthlyMobileQcCnt || 0
            
            // 숫자 또는 문자열 모두 처리 - 안전한 replace 처리
            let pcSearch: number
            if (typeof pcSearchValue === 'string') {
              // 문자열인 경우 replace 함수 사용 가능 여부 확인
              if (typeof pcSearchValue.replace === 'function') {
                const cleanedValue = pcSearchValue.replace(/[<>\s]/g, '')
                pcSearch = Math.max(parseInt(cleanedValue) || 10, 10)
              } else {
                // replace 함수가 없는 경우 직접 처리
                pcSearch = Math.max(parseInt(pcSearchValue) || 10, 10)
              }
            } else {
              pcSearch = Math.max(pcSearchValue, 10)
            }

            let mobileSearch: number
            if (typeof mobileSearchValue === 'string') {
              if (typeof mobileSearchValue.replace === 'function') {
                const cleanedValue = mobileSearchValue.replace(/[<>\s]/g, '')
                mobileSearch = Math.max(parseInt(cleanedValue) || 10, 10)
              } else {
                mobileSearch = Math.max(parseInt(mobileSearchValue) || 10, 10)
              }
            } else {
              mobileSearch = Math.max(mobileSearchValue, 10)
            }
            
            return {
              rel_keyword: item.relKeyword || '',
              pc_search: pcSearch,
              mobile_search: mobileSearch,
              total_search: pcSearch + mobileSearch,
              ctr_pc: parseFloat(item.monthlyAvePcCtr?.toString() || '0'),
              ctr_mo: parseFloat(item.monthlyAveMobileCtr?.toString() || '0'),
              ad_count: parseInt(item.plAvgDepth || '0'),
              comp_idx: item.compIdx || '중간',
              blog_count: 0, // 문서수는 나중에 자동으로 추가
              cafe_count: 0,
              news_count: 0,
              web_count: 0,
              total_docs: 0,
              potential_score: 0,
              seed_usage: 'N/A',
              source: 'fresh' as const
            }
          }) || []

          results.push({
            keyword,
            related: normalizedData
          })

          // 데이터 자동 저장 및 문서수 정보 자동 추가
          try {
            const saveResponse = await fetch('/api/save-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                keyword,
                related: normalizedData,
                autoUpdateDocuments: true // 문서수 자동 업데이트 플래그
              })
            })
            
            if (saveResponse.ok) {
              const saveResult = await saveResponse.json()
              console.log(`데이터 저장 및 문서수 업데이트 완료 (${keyword}):`, saveResult)
            } else {
              console.error(`데이터 저장 실패 (${keyword}):`, saveResponse.status)
            }
          } catch (saveError) {
            console.error(`데이터 저장 오류 (${keyword}):`, saveError)
          }
        } catch (error) {
          console.error(`Error processing keyword ${keyword}:`, error)
          // 에러가 발생해도 다른 키워드는 계속 처리
          results.push({
            keyword,
            related: [{
              rel_keyword: `${keyword} (오류 발생)`,
              pc_search: 0,
              mobile_search: 0,
              total_search: 0,
              ctr_pc: 0,
              ctr_mo: 0,
              ad_count: 0,
              comp_idx: '오류',
              blog_count: 0,
              cafe_count: 0,
              news_count: 0,
              web_count: 0,
              total_docs: 0,
              potential_score: 0,
              seed_usage: 'N/A',
              source: 'error' as const
            }]
          })
        }
      }
      
      setResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">황금키워드 탐색기</h1>
            </div>
            <nav className="flex space-x-4">
              <a href="/data" className="flex items-center text-gray-600 hover:text-gray-900">
                <Database className="h-4 w-4 mr-1" />
                데이터
              </a>
              <a href="/analytics" className="flex items-center text-gray-600 hover:text-gray-900">
                <TrendingUp className="h-4 w-4 mr-1" />
                분석
              </a>
              <a href="/api-status" className="flex items-center text-gray-600 hover:text-gray-900">
                <Key className="h-4 w-4 mr-1" />
                API 상태
              </a>
              <a href="/debug" className="flex items-center text-gray-600 hover:text-gray-900">
                <Bug className="h-4 w-4 mr-1" />
                디버그
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="card-elevated mb-8 fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Search className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">키워드 검색</h2>
            <p className="text-gray-600 text-lg">최대 5개의 키워드를 쉼표로 구분하여 입력하세요</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="예: 풀빌라, 강원도풀빌라, 제주도풀빌라"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="input-field text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn-primary flex items-center gap-2 text-lg px-6 py-3 disabled:opacity-50"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                {loading ? '검색중...' : '검색하기'}
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">5개</div>
                <div className="text-sm text-blue-600">최대 키워드</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">실시간</div>
                <div className="text-sm text-green-600">데이터 수집</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">자동</div>
                <div className="text-sm text-purple-600">저장 및 분석</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              검색 결과는 자동으로 <a href="/data" className="text-primary-600 hover:underline font-medium">데이터</a> 메뉴에 저장됩니다.
            </p>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-8 slide-up">
            {results.map((result, index) => (
              <KeywordTable
                key={index}
                keyword={result.keyword}
                related={result.related}
                index={index}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
