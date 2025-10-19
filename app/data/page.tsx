'use client'

import { useState, useEffect } from 'react'

interface KeywordData {
  id: string
  seed_keyword: string
  keyword: string
  pc_search: number
  mobile_search: number
  total_search: number
  monthly_click_pc: number
  monthly_click_mobile: number
  ctr_pc: number
  ctr_mobile: number
  ad_count: number
  comp_idx: string
  blog_count: number
  news_count: number
  webkr_count: number
  cafe_count: number
  is_used_as_seed: boolean
  created_at: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function DataPage() {
  const [data, setData] = useState<KeywordData[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 필터 상태
  const [search, setSearch] = useState('')
  const [seedKeyword, setSeedKeyword] = useState('')
  const [sortBy, setSortBy] = useState('cafe_count')
  const [sortOrder, setSortOrder] = useState('asc')
  const [seedKeywords, setSeedKeywords] = useState<string[]>([])
  
  // 범위 필터 상태
  const [totalSearchMin, setTotalSearchMin] = useState('')
  const [totalSearchMax, setTotalSearchMax] = useState('')
  const [cafeCountMin, setCafeCountMin] = useState('')
  const [cafeCountMax, setCafeCountMax] = useState('')
  const [blogCountMin, setBlogCountMin] = useState('')
  const [blogCountMax, setBlogCountMax] = useState('')
  const [newsCountMin, setNewsCountMin] = useState('')
  const [newsCountMax, setNewsCountMax] = useState('')
  const [webkrCountMin, setWebkrCountMin] = useState('')
  const [webkrCountMax, setWebkrCountMax] = useState('')

  // 데이터 로드
  const loadData = async (page: number = 1) => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        sortBy,
        sortOrder
      })
      
      if (seedKeyword) {
        params.append('seedKeyword', seedKeyword)
      }
      
      // 범위 필터 파라미터 추가
      if (totalSearchMin) params.append('totalSearchMin', totalSearchMin)
      if (totalSearchMax) params.append('totalSearchMax', totalSearchMax)
      if (cafeCountMin) params.append('cafeCountMin', cafeCountMin)
      if (cafeCountMax) params.append('cafeCountMax', cafeCountMax)
      if (blogCountMin) params.append('blogCountMin', blogCountMin)
      if (blogCountMax) params.append('blogCountMax', blogCountMax)
      if (newsCountMin) params.append('newsCountMin', newsCountMin)
      if (newsCountMax) params.append('newsCountMax', newsCountMax)
      if (webkrCountMin) params.append('webkrCountMin', webkrCountMin)
      if (webkrCountMax) params.append('webkrCountMax', webkrCountMax)

      const response = await fetch(`/api/data?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '데이터를 불러오는데 실패했습니다.')
      }

      const result = await response.json()
      setData(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 시드키워드 목록 로드
  const loadSeedKeywords = async () => {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'getSeedKeywords' })
      })

      if (response.ok) {
        const result = await response.json()
        setSeedKeywords(result.seedKeywords)
      }
    } catch (err) {
      console.error('시드키워드 목록 로드 실패:', err)
    }
  }

  // 필터 초기화
  const resetFilters = () => {
    setSearch('')
    setSeedKeyword('')
    setTotalSearchMin('')
    setTotalSearchMax('')
    setCafeCountMin('')
    setCafeCountMax('')
    setBlogCountMin('')
    setBlogCountMax('')
    setNewsCountMin('')
    setNewsCountMax('')
    setWebkrCountMin('')
    setWebkrCountMax('')
    setSortBy('cafe_count')
    setSortOrder('asc')
    // 필터 초기화 후 데이터 다시 로드
    setTimeout(() => loadData(1), 100)
  }

  // 초기 로드
  useEffect(() => {
    loadData()
    loadSeedKeywords()
  }, [])

  // 필터 변경 시 자동으로 데이터 다시 로드 (디바운스 적용)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData(1)
    }, 500) // 500ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [search, seedKeyword, sortBy, sortOrder, totalSearchMin, totalSearchMax, cafeCountMin, cafeCountMax, blogCountMin, blogCountMax, newsCountMin, newsCountMax, webkrCountMin, webkrCountMax])

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    loadData(newPage)
  }

  // CSV 내보내기
  const exportToCSV = () => {
    if (data.length === 0) return

    const headers = ['키워드', 'PC 검색량', '모바일 검색량', '총 검색량', '카페문서수', '블로그문서수', '웹문서수', '뉴스문서수', 'PC CTR', '모바일 CTR', '광고수', '경쟁지수', '시드활용', '수집일시']
    
    const escapeCSVField = (field: any): string => {
      const str = String(field || '')
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [
      headers.map(escapeCSVField).join(','),
      ...data.map(item => [
        escapeCSVField(item.keyword),
        escapeCSVField(item.pc_search),
        escapeCSVField(item.mobile_search),
        escapeCSVField(item.total_search),
        escapeCSVField(item.cafe_count),
        escapeCSVField(item.blog_count),
        escapeCSVField(item.webkr_count),
        escapeCSVField(item.news_count),
        escapeCSVField(item.ctr_pc),
        escapeCSVField(item.ctr_mobile),
        escapeCSVField(item.ad_count),
        escapeCSVField(item.comp_idx),
        escapeCSVField(item.is_used_as_seed ? '활용' : '미활용'),
        escapeCSVField(new Date(item.created_at).toLocaleString('ko-KR'))
      ].join(','))
    ].join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `keyword_data_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  // 문서수 일괄 업데이트
  const updateAllDocumentCounts = async () => {
    if (!confirm('모든 키워드의 문서수를 수집하시겠습니까? 이 작업은 시간이 오래 걸릴 수 있습니다.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/update-document-counts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '문서수 업데이트에 실패했습니다.')
      }

      const result = await response.json()
      alert(`문서수 업데이트 완료!\n총 ${result.totalKeywords}개 키워드 중 ${result.updatedCount}개 업데이트됨`)
      
      // 데이터 새로고침
      loadData(pagination.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서수 업데이트 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">수집 데이터</h1>
        <div className="flex space-x-2">
          <button
            onClick={updateAllDocumentCounts}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : '문서수 수집'}
          </button>
          <button
            onClick={exportToCSV}
            disabled={data.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">필터 및 검색</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              키워드 검색
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="키워드 검색..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시드키워드
            </label>
            <select
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {seedKeywords.map((keyword) => (
                <option key={keyword} value={keyword}>
                  {keyword}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              정렬 기준
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cafe_count">카페문서수</option>
              <option value="blog_count">블로그문서수</option>
              <option value="news_count">뉴스문서수</option>
              <option value="webkr_count">웹문서수</option>
              <option value="total_search">총 검색량</option>
              <option value="pc_search">PC 검색량</option>
              <option value="mobile_search">모바일 검색량</option>
              <option value="created_at">수집일시</option>
              <option value="keyword">키워드</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              정렬 순서
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">내림차순</option>
              <option value="asc">오름차순</option>
            </select>
          </div>
        </div>
        
        {/* 범위 필터 */}
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-700 mb-3">범위 필터</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 총 검색량 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                총 검색량
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={totalSearchMin}
                  onChange={(e) => setTotalSearchMin(e.target.value)}
                  placeholder="최소"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={totalSearchMax}
                  onChange={(e) => setTotalSearchMax(e.target.value)}
                  placeholder="최대"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* 카페문서수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카페문서수
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cafeCountMin}
                  onChange={(e) => setCafeCountMin(e.target.value)}
                  placeholder="최소"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={cafeCountMax}
                  onChange={(e) => setCafeCountMax(e.target.value)}
                  placeholder="최대"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* 블로그문서수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                블로그문서수
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={blogCountMin}
                  onChange={(e) => setBlogCountMin(e.target.value)}
                  placeholder="최소"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={blogCountMax}
                  onChange={(e) => setBlogCountMax(e.target.value)}
                  placeholder="최대"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* 뉴스문서수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                뉴스문서수
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newsCountMin}
                  onChange={(e) => setNewsCountMin(e.target.value)}
                  placeholder="최소"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={newsCountMax}
                  onChange={(e) => setNewsCountMax(e.target.value)}
                  placeholder="최대"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* 웹문서수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                웹문서수
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={webkrCountMin}
                  onChange={(e) => setWebkrCountMin(e.target.value)}
                  placeholder="최소"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={webkrCountMax}
                  onChange={(e) => setWebkrCountMax(e.target.value)}
                  placeholder="최대"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            필터 초기화
          </button>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">데이터를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => loadData(pagination.page)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  총 {pagination.total.toLocaleString()}개 데이터
                </h3>
                <span className="text-sm text-gray-500">
                  {pagination.page} / {pagination.totalPages} 페이지
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      키워드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PC 검색량
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      모바일 검색량
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총 검색량
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카페문서수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      블로그문서수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      웹문서수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      뉴스문서수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PC CTR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      모바일 CTR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      광고수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      경쟁지수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      시드활용
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수집일시
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.keyword}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.pc_search.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.mobile_search.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {item.total_search.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.cafe_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.blog_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.webkr_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.news_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.ctr_pc}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.ctr_mobile}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.ad_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.comp_idx === 'HIGH' ? 'bg-red-100 text-red-800' :
                          item.comp_idx === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.comp_idx}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.is_used_as_seed ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.is_used_as_seed ? '활용' : '미활용'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      이전
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      다음
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                        {' - '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>
                        {' / '}
                        <span className="font-medium">{pagination.total.toLocaleString()}</span>
                        {' 개 결과'}
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!pagination.hasPrev}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          이전
                        </button>
                        
                        {/* 페이지 번호들 */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const startPage = Math.max(1, pagination.page - 2)
                          const pageNum = startPage + i
                          if (pageNum > pagination.totalPages) return null
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!pagination.hasNext}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          다음
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
