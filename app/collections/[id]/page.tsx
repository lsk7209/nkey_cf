'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, Pause, RefreshCw, Download, BarChart3, TrendingUp, Users, Target } from 'lucide-react'

interface Collection {
  id: string
  name: string
  description?: string
  seed_keywords: string[]
  status: 'pending' | 'collecting' | 'completed' | 'failed'
  total_keywords: number
  created_at: string
  updated_at: string
  completed_at?: string
}

interface Keyword {
  id: string
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
  fetched_at: string
}

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const collectionId = params.id as string

  const [collection, setCollection] = useState<Collection | null>(null)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCollecting, setIsCollecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (collectionId) {
      fetchCollection()
      fetchKeywords()
    }
  }, [collectionId])

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/collections/${collectionId}`)
      if (!response.ok) {
        throw new Error('수집 세션 정보를 불러오는데 실패했습니다.')
      }
      const data = await response.json()
      setCollection(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    }
  }

  const fetchKeywords = async () => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/keywords`)
      if (!response.ok) {
        throw new Error('키워드 목록을 불러오는데 실패했습니다.')
      }
      const data = await response.json()
      setKeywords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartCollection = async () => {
    setIsCollecting(true)
    try {
      const response = await fetch(`/api/collections/${collectionId}/collect`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('키워드 수집을 시작하는데 실패했습니다.')
      }

      // 폴링으로 상태 확인
      const pollStatus = async () => {
        try {
          await fetchCollection()
          if (collection?.status === 'collecting') {
            setTimeout(pollStatus, 3000) // 3초마다 확인
          } else {
            await fetchKeywords()
            setIsCollecting(false)
          }
        } catch (err) {
          setIsCollecting(false)
        }
      }

      setTimeout(pollStatus, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      setIsCollecting(false)
    }
  }

  const handleExportCSV = () => {
    if (keywords.length === 0) return

    const headers = [
      '키워드',
      'PC 검색수',
      '모바일 검색수',
      '총 검색수',
      'PC 클릭수',
      '모바일 클릭수',
      'PC CTR',
      '모바일 CTR',
      '광고수',
      '경쟁도',
      '수집일시'
    ]

    const csvContent = [
      headers.join(','),
      ...keywords.map(keyword => [
        `"${keyword.keyword}"`,
        keyword.pc_search,
        keyword.mobile_search,
        keyword.total_search,
        keyword.monthly_click_pc,
        keyword.monthly_click_mobile,
        keyword.ctr_pc,
        keyword.ctr_mobile,
        keyword.ad_count,
        `"${keyword.comp_idx}"`,
        `"${new Date(keyword.fetched_at).toLocaleString('ko-KR')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${collection?.name || 'keywords'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: Collection['status']) => {
    const statusMap = {
      pending: { label: '대기중', className: 'status-pending' },
      collecting: { label: '수집중', className: 'status-collecting' },
      completed: { label: '완료', className: 'status-completed' },
      failed: { label: '실패', className: 'status-failed' },
    }

    const statusInfo = statusMap[status]
    return (
      <span className={`status-badge ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">수집 세션을 찾을 수 없습니다.</p>
        <button onClick={() => router.back()} className="btn-primary mt-4">
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
            {getStatusBadge(collection.status)}
          </div>
          {collection.description && (
            <p className="text-gray-600">{collection.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {collection.status === 'pending' && (
            <button
              onClick={handleStartCollection}
              disabled={isCollecting}
              className="btn-primary"
            >
              {isCollecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  수집 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  수집 시작
                </>
              )}
            </button>
          )}
          {keywords.length > 0 && (
            <button onClick={handleExportCSV} className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              CSV 다운로드
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-primary-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">총 키워드</p>
              <p className="text-2xl font-bold text-gray-900">{keywords.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">평균 검색수</p>
              <p className="text-2xl font-bold text-gray-900">
                {keywords.length > 0 
                  ? Math.round(keywords.reduce((sum, k) => sum + k.total_search, 0) / keywords.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">평균 CTR</p>
              <p className="text-2xl font-bold text-gray-900">
                {keywords.length > 0 
                  ? ((keywords.reduce((sum, k) => sum + k.ctr_pc + k.ctr_mobile, 0) / keywords.length) / 2).toFixed(1)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">평균 광고수</p>
              <p className="text-2xl font-bold text-gray-900">
                {keywords.length > 0 
                  ? Math.round(keywords.reduce((sum, k) => sum + k.ad_count, 0) / keywords.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keywords Table */}
      {keywords.length > 0 ? (
        <div className="card">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">수집된 키워드</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    키워드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PC 검색수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    모바일 검색수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 검색수
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
                    경쟁도
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keywords.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {keyword.keyword}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {keyword.pc_search.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {keyword.mobile_search.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {keyword.total_search.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {keyword.ctr_pc.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {keyword.ctr_mobile.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {keyword.ad_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-badge ${
                        keyword.comp_idx === '높음' ? 'status-failed' :
                        keyword.comp_idx === '중간' ? 'status-pending' :
                        'status-completed'
                      }`}>
                        {keyword.comp_idx}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            수집된 키워드가 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            {collection.status === 'pending' 
              ? '수집을 시작하면 키워드가 표시됩니다'
              : '수집이 완료되면 키워드가 표시됩니다'
            }
          </p>
          {collection.status === 'pending' && (
            <button
              onClick={handleStartCollection}
              disabled={isCollecting}
              className="btn-primary"
            >
              {isCollecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  수집 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  수집 시작
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
