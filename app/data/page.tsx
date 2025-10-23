'use client'

import { useState, useEffect } from 'react'
import { Database, Download, Search, Filter, Calendar } from 'lucide-react'
import DataTableSkeleton from '../components/DataTableSkeleton'

interface KeywordRecord {
  id: number
  date_bucket: string
  keyword: string
  rel_keyword: string
  pc_search: number
  mobile_search: number
  total_search: number
  cafe_count: number
  blog_count: number
  web_count: number
  news_count: number
  total_docs: number
  potential_score: number
  ctr_pc: number
  ctr_mo: number
  ad_count: number
  comp_idx: string
  seed_usage: string
  fetched_at: string
}

interface DataResponse {
  total: number
  items: KeywordRecord[]
  page: number
  totalPages: number
}

export default function DataPage() {
  const [data, setData] = useState<KeywordRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [totalPages, setTotalPages] = useState(0)
  
  // 필터 상태
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [compFilter, setCompFilter] = useState('all')
  const [sortBy, setSortBy] = useState('cafe_count')
  const [sortOrder, setSortOrder] = useState('asc')
  
  // 문서수 자동 수집 상태
  const [isUpdatingDocs, setIsUpdatingDocs] = useState(false)
  const [updateProgress, setUpdateProgress] = useState('')
  
  // 자동수집 상태
  const [isAutoCollecting, setIsAutoCollecting] = useState(false)
  const [autoCollectStatus, setAutoCollectStatus] = useState<{
    message: string
    isRunning: boolean
    currentKeywordIndex?: number
    totalKeywords?: number
  } | null>(null)
  const [maxKeywords, setMaxKeywords] = useState(10)

  const fetchData = async () => {
    setLoading(true)
    const startTime = Date.now()
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(query && { query }),
        ...(dateFilter !== 'all' && { dateFilter }),
        ...(compFilter !== 'all' && { compFilter }),
      })

      console.log('데이터 불러오기 요청:', params.toString())
      
      const response = await fetch(`/api/load-data?${params.toString()}`)
      
      if (!response.ok) {
        console.error(`데이터 불러오기 실패: ${response.status}`)
        // 오류 시에도 빈 데이터로 처리
        setData([])
        setTotal(0)
        setTotalPages(0)
        return
      }
      
      const result: DataResponse = await response.json()
      const loadTime = Date.now() - startTime
      console.log(`데이터 불러오기 완료: ${loadTime}ms, ${result.total}개 레코드`)
      
      setData(result.items || [])
      setTotal(result.total || 0)
      setTotalPages(result.totalPages || 0)
    } catch (error) {
      console.error('Error fetching data:', error)
      // 에러 시 빈 데이터 표시
      setData([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpdateDocuments = async () => {
    if (!confirm('모든 키워드의 문서수를 업데이트하시겠습니까? 시간이 오래 걸릴 수 있습니다.')) {
      return
    }

    setIsUpdatingDocs(true)
    setUpdateProgress('전체 문서수 업데이트를 시작합니다...')

    try {
      console.log('문서수 업데이트 요청 시작...')
      
      const response = await fetch('/api/update-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: 'all', // 모든 키워드
          limit: 100
        })
      })

      console.log('문서수 업데이트 응답:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('문서수 업데이트 결과:', result)
      
      setUpdateProgress('전체 문서수 업데이트가 완료되었습니다. 데이터를 새로고침합니다...')
      
      // 데이터 새로고침
      await fetchData()
      
      alert(`전체 문서수 업데이트 완료: ${result.updatedCount}개 업데이트됨${result.errorCount > 0 ? `, ${result.errorCount}개 오류` : ''}`)
    } catch (error) {
      console.error('대량 문서수 업데이트 오류:', error)
      alert(`전체 문서수 업데이트 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsUpdatingDocs(false)
      setUpdateProgress('')
    }
  }

  const handleUpdateDocuments = async () => {
    if (data.length === 0) {
      alert('업데이트할 데이터가 없습니다.')
      return
    }

    setIsUpdatingDocs(true)
    setUpdateProgress('문서수 수집을 시작합니다...')

    try {
      // 현재 페이지의 키워드들에 대해 문서수 업데이트
      const keywords = [...new Set(data.map(item => item.keyword))]
      
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i]
        setUpdateProgress(`문서수 수집 중... (${i + 1}/${keywords.length}) - ${keyword}`)
        
        const response = await fetch('/api/update-documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword: keyword,
            limit: 50 // 한 번에 최대 50개씩 처리
          })
        })

        if (!response.ok) {
          console.error(`문서수 업데이트 실패: ${response.status}`)
          continue
        }

        const result = await response.json()
        console.log(`문서수 업데이트 결과 (${keyword}):`, result)
      }

      setUpdateProgress('문서수 수집이 완료되었습니다. 데이터를 새로고침합니다...')
      
      // 데이터 새로고침
      await fetchData()
      
      alert('문서수 수집이 완료되었습니다!')
    } catch (error) {
      console.error('문서수 업데이트 오류:', error)
      alert('문서수 수집 중 오류가 발생했습니다.')
    } finally {
      setIsUpdatingDocs(false)
      setUpdateProgress('')
    }
  }

  const handleExport = async () => {
    try {
      // CSV 헤더
      const headers = [
        '키워드',
        'PC 검색량',
        '모바일 검색량',
        '총 검색량',
        '카페문서수',
        '블로그문서수',
        '웹문서수',
        '뉴스문서수',
        '총문서수',
        '잠재력점수',
        'PC CTR',
        '모바일 CTR',
        '광고수',
        '경쟁지수',
        '시드활용',
        '수집일시'
      ]

      // 데이터를 CSV 형식으로 변환
      const csvRows = [
        headers.join(','),
        ...data.map(item => [
          item.rel_keyword,
          item.pc_search,
          item.mobile_search,
          item.total_search || (item.pc_search + item.mobile_search),
          item.cafe_count,
          item.blog_count,
          item.web_count,
          item.news_count,
          item.total_docs || (item.cafe_count + item.blog_count + item.web_count + item.news_count),
          item.potential_score || 0,
          item.ctr_pc,
          item.ctr_mo,
          item.ad_count,
          item.comp_idx,
          item.seed_usage || 'N/A',
          new Date(item.fetched_at).toLocaleString('ko-KR')
        ].join(','))
      ]

      const csvContent = csvRows.join('\n')
      const bom = '\uFEFF' // UTF-8 BOM
      const csvWithBom = bom + csvContent

      const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `keywords_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('CSV 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 자동수집 상태 확인
  const checkAutoCollectStatus = async () => {
    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'status' })
      })

      if (response.ok) {
        const result = await response.json()
        setAutoCollectStatus(result)
        setIsAutoCollecting(result.isRunning || false)
      }
    } catch (error) {
      console.error('자동수집 상태 확인 오류:', error)
    }
  }

  // 자동수집 시작
  const handleStartAutoCollect = async () => {
    if (maxKeywords < 1 || maxKeywords > 50) {
      alert('키워드 개수는 1-50개 사이로 입력해주세요.')
      return
    }

    setIsAutoCollecting(true)
    setAutoCollectStatus(null)

    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'start',
          maxKeywords: maxKeywords
        })
      })

      if (!response.ok) {
        throw new Error('자동수집 시작 실패')
      }

      const result = await response.json()
      setAutoCollectStatus(result.status)
      alert(result.message)
      
      // 상태 확인 시작
      const statusInterval = setInterval(async () => {
        await checkAutoCollectStatus()
        if (!isAutoCollecting) {
          clearInterval(statusInterval)
          await fetchData() // 데이터 새로고침
        }
      }, 3000) // 3초마다 확인

    } catch (error) {
      console.error('자동수집 시작 오류:', error)
      alert('자동수집 시작 중 오류가 발생했습니다.')
      setIsAutoCollecting(false)
    }
  }

  // 자동수집 중지
  const handleStopAutoCollect = async () => {
    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'stop' })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        setIsAutoCollecting(false)
        setAutoCollectStatus(null)
      }
    } catch (error) {
      console.error('자동수집 중지 오류:', error)
      alert('자동수집 중지 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    fetchData()
    checkAutoCollectStatus() // 자동수집 상태 확인
  }, [page, pageSize, query, dateFilter, compFilter, sortBy, sortOrder])

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}만`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}천`
    }
    return num.toLocaleString()
  }

  const getDateRange = (filter: string) => {
    const today = new Date()
    switch (filter) {
      case 'today':
        return today.toISOString().split('T')[0]
      case '7days':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        return weekAgo.toISOString().split('T')[0]
      case '30days':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        return monthAgo.toISOString().split('T')[0]
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">데이터 관리</h1>
            </div>
            <nav className="flex space-x-4">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                홈으로
              </a>
              <a href="/analytics" className="text-gray-600 hover:text-gray-900">
                분석
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="키워드 검색..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">전체 기간</option>
                <option value="today">오늘</option>
                <option value="7days">최근 7일</option>
                <option value="30days">최근 30일</option>
              </select>
              
              <select
                value={compFilter}
                onChange={(e) => setCompFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">전체 경쟁도</option>
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
              </select>
              
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field)
                  setSortOrder(order)
                }}
                className="input-field"
              >
                <option value="cafe_count-asc">카페문서수 낮은순 (기본)</option>
                <option value="cafe_count-desc">카페문서수 높은순</option>
                <option value="total_search-desc">총검색량 높은순</option>
                <option value="total_search-asc">총검색량 낮은순</option>
                <option value="potential_score-desc">잠재지수 높은순</option>
                <option value="potential_score-asc">잠재지수 낮은순</option>
                <option value="fetched_at-desc">최신순</option>
                <option value="fetched_at-asc">오래된순</option>
              </select>
            </div>
            
            <button
              onClick={handleUpdateDocuments}
              disabled={isUpdatingDocs || data.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Database className="h-4 w-4" />
              {isUpdatingDocs ? '문서수 수집 중...' : '문서수 자동 수집'}
            </button>
            
            <button
              onClick={handleBulkUpdateDocuments}
              disabled={isUpdatingDocs}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Database className="h-4 w-4" />
              전체 문서수 업데이트
            </button>
            
            <button
              onClick={handleExport}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV 다운로드
            </button>
          </div>
        </div>

        {/* 자동수집 컨트롤 */}
        <div className="card mb-6 bg-green-50 border-green-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-green-800 font-medium">시드키워드 개수:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxKeywords}
                onChange={(e) => setMaxKeywords(parseInt(e.target.value) || 10)}
                disabled={isAutoCollecting}
                className="input-field w-20 text-center"
              />
            </div>
            
            {!isAutoCollecting ? (
              <button
                onClick={handleStartAutoCollect}
                className="btn-primary flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                자동수집 시작
              </button>
            ) : (
              <button
                onClick={handleStopAutoCollect}
                className="btn-secondary flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                자동수집 중지
              </button>
            )}
            
            {autoCollectStatus && (
              <div className="text-green-700 text-sm">
                {autoCollectStatus.message}
                {autoCollectStatus.isRunning && (
                  <span className="ml-2">
                    ({autoCollectStatus.currentKeywordIndex || 0}/{autoCollectStatus.totalKeywords || 0})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 문서수 수집 진행 상황 */}
        {isUpdatingDocs && (
          <div className="card mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-blue-800 font-medium">문서수 자동 수집 중...</p>
                <p className="text-blue-600 text-sm">{updateProgress}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div className="stat-number text-primary-600">{total.toLocaleString()}</div>
            <div className="stat-label">총 레코드</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-green-600">
              {data.filter(d => d.comp_idx === '낮음').length}
            </div>
            <div className="stat-label">낮은 경쟁도</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-yellow-600">
              {data.filter(d => d.comp_idx === '중간').length}
            </div>
            <div className="stat-label">중간 경쟁도</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-red-600">
              {data.filter(d => d.comp_idx === '높음').length}
            </div>
            <div className="stat-label">높은 경쟁도</div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <DataTableSkeleton />
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              {data.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        키워드
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PC 검색량
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        모바일 검색량
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        총 검색량
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        카페문서수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        블로그문서수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        웹문서수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        뉴스문서수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        총문서수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        잠재력점수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PC CTR
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        모바일 CTR
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        광고수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        경쟁지수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        시드활용
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        수집일시
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.rel_keyword}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.pc_search)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.mobile_search)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.total_search || (item.pc_search + item.mobile_search))}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.cafe_count)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.blog_count)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.web_count)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.news_count)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.total_docs || (item.cafe_count + item.blog_count + item.web_count + item.news_count))}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            (item.potential_score || 0) > 10 ? 'bg-green-100 text-green-800' :
                            (item.potential_score || 0) > 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {(item.potential_score || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.ctr_pc}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.ctr_mo}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.ad_count}개
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
                          {item.seed_usage || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(item.fetched_at).toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">페이지 크기:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setPage(1)
                      }}
                      className="input-field text-sm"
                    >
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                      <option value={500}>500</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-700">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
