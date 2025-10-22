'use client'

import { useState } from 'react'
import { Search, Database, TrendingUp, FileText, Key, Bug } from 'lucide-react'

interface KeywordData {
  rel_keyword: string
  pc_search: number
  mobile_search: number
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
          
          // SearchAd API와 OpenAPI 병렬 호출
          const [searchAdResponse, openApiResponse] = await Promise.all([
            fetch('/api/searchad', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keywords: [keyword] })
            }),
            fetch('/api/openapi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keyword })
            })
          ])

          console.log('SearchAd 응답 상태:', searchAdResponse.status)
          console.log('OpenAPI 응답 상태:', openApiResponse.status)

          if (!searchAdResponse.ok) {
            throw new Error(`SearchAd API 오류: ${searchAdResponse.status}`)
          }
          if (!openApiResponse.ok) {
            throw new Error(`OpenAPI 오류: ${openApiResponse.status}`)
          }

          const [searchAdData, openApiData] = await Promise.all([
            searchAdResponse.json(),
            openApiResponse.json()
          ])

          console.log('SearchAd 데이터:', searchAdData)
          console.log('OpenAPI 데이터:', openApiData)

          // 데이터 정규화 (네이버 API 응답 필드에 맞게 수정)
          const normalizedData = searchAdData.keywordList?.map((item: any) => {
            // 검색량 정규화 (< 10 처리)
            const pcSearchValue = item.monthlyPcQcCnt || 0
            const mobileSearchValue = item.monthlyMobileQcCnt || 0
            
            // 숫자 또는 문자열 모두 처리
            const pcSearch = typeof pcSearchValue === 'string' 
              ? Math.max(parseInt(pcSearchValue.replace(/[<>\s]/g, '')) || 10, 10)
              : Math.max(pcSearchValue, 10)
            const mobileSearch = typeof mobileSearchValue === 'string'
              ? Math.max(parseInt(mobileSearchValue.replace(/[<>\s]/g, '')) || 10, 10)
              : Math.max(mobileSearchValue, 10)
            
            // 문서수 계산
            const totalDocs = openApiData.blog + openApiData.cafe + openApiData.news + openApiData.web
            const potentialScore = ((pcSearch + mobileSearch) / Math.max(totalDocs, 1)) * 100

            return {
              rel_keyword: item.relKeyword || '',
              pc_search: pcSearch,
              mobile_search: mobileSearch,
              ctr_pc: parseFloat(item.monthlyAvePcCtr?.toString() || '0'),
              ctr_mo: parseFloat(item.monthlyAveMobileCtr?.toString() || '0'),
              ad_count: parseInt(item.plAvgDepth || '0'),
              comp_idx: item.compIdx || '중간',
              blog_count: openApiData.blog,
              cafe_count: openApiData.cafe,
              news_count: openApiData.news,
              web_count: openApiData.web,
              total_docs: totalDocs,
              potential_score: potentialScore,
              source: 'fresh' as const
            }
          }) || []

          results.push({
            keyword,
            related: normalizedData
          })
        } catch (error) {
          console.error(`Error processing keyword ${keyword}:`, error)
          // 에러가 발생해도 다른 키워드는 계속 처리
          results.push({
            keyword,
            related: [{
              rel_keyword: `${keyword} (오류 발생)`,
              pc_search: 0,
              mobile_search: 0,
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

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'fresh':
        return <span className="badge badge-fresh">신규 수집</span>
      case 'cache':
        return <span className="badge badge-cache">캐시</span>
      case 'cooldown':
        return <span className="badge badge-cooldown">쿨다운</span>
      default:
        return <span className="badge badge-cache">캐시</span>
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}만`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}천`
    }
    return num.toLocaleString()
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
        <div className="card mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">키워드 검색</h2>
            <p className="text-gray-600">최대 5개의 키워드를 쉼표로 구분하여 입력하세요</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="예: 풀빌라, 강원도풀빌라, 제주도풀빌라"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                {loading ? '검색중...' : '검색하기'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              <FileText className="inline h-4 w-4 mr-1" />
              검색 결과는 자동으로 <a href="/data" className="text-primary-600 hover:underline">데이터</a> 메뉴에 저장됩니다.
            </p>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={index} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    키워드: {result.keyword}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {result.related.length}개 관련 키워드
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          관련키워드
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          검색량
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CTR
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          광고수
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          문서수
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          경쟁도
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          잠재지수
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.related.map((item, itemIndex) => (
                        <tr key={itemIndex} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.rel_keyword}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div>PC: {formatNumber(item.pc_search)}</div>
                              <div className="text-gray-500">모바일: {formatNumber(item.mobile_search)}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div>PC: {item.ctr_pc}%</div>
                              <div className="text-gray-500">모바일: {item.ctr_mo}%</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.ad_count}개
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div>블로그: {formatNumber(item.blog_count)}</div>
                              <div>카페: {formatNumber(item.cafe_count)}</div>
                              <div>뉴스: {formatNumber(item.news_count)}</div>
                              <div>웹: {formatNumber(item.web_count)}</div>
                              <div className="font-medium text-primary-600">
                                총: {formatNumber(item.total_docs)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.comp_idx === '높음' ? 'bg-red-100 text-red-800' :
                              item.comp_idx === '중간' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.comp_idx}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="font-medium text-primary-600">
                              {item.potential_score.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getSourceBadge(item.source)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
