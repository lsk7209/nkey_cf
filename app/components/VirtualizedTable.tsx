'use client'

import { memo, useState, useEffect, useMemo } from 'react'

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

interface VirtualizedTableProps {
  data: KeywordRecord[]
  loading: boolean
}

const VirtualizedTable = memo(({ data, loading }: VirtualizedTableProps) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })
  const [containerHeight, setContainerHeight] = useState(600)
  const ITEM_HEIGHT = 60 // 각 행의 높이
  const BUFFER_SIZE = 10 // 위아래 버퍼

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}만`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}천`
    }
    return num.toLocaleString()
  }

  const visibleData = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end)
  }, [data, visibleRange])

  const totalHeight = data.length * ITEM_HEIGHT

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE)
    const end = Math.min(
      data.length,
      Math.floor((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    )
    
    setVisibleRange({ start, end })
  }

  useEffect(() => {
    const updateHeight = () => {
      setContainerHeight(window.innerHeight - 400) // 헤더와 필터 높이 제외
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-gray-300 mb-4">📊</div>
          <p className="text-gray-500">데이터가 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="mb-4 text-sm text-gray-600">
        총 {data.length.toLocaleString()}개 키워드 (가상화 테이블)
      </div>
      
      <div 
        className="overflow-auto border border-gray-200 rounded-lg"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div 
            style={{ 
              transform: `translateY(${visibleRange.start * ITEM_HEIGHT}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
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
                {visibleData.map((item, index) => (
                  <tr key={item.id} className="table-row-hover" style={{ height: ITEM_HEIGHT }}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.rel_keyword}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.pc_search)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.mobile_search)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.total_search || (item.pc_search + item.mobile_search))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.cafe_count)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.blog_count)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.web_count)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.news_count)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.total_docs || (item.cafe_count + item.blog_count + item.web_count + item.news_count))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        (item.potential_score || 0) > 10 ? 'bg-green-100 text-green-800' :
                        (item.potential_score || 0) > 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(item.potential_score || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.ctr_pc}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.ctr_mo}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.ad_count}개
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.comp_idx === '높음' ? 'bg-red-100 text-red-800' :
                        item.comp_idx === '중간' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.comp_idx}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.seed_usage || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.fetched_at).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
})

VirtualizedTable.displayName = 'VirtualizedTable'

export default VirtualizedTable
