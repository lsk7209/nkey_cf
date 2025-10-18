'use client'

import { useState, useEffect } from 'react'
import { Search, BarChart3, Database, Zap, Loader2, AlertCircle, Download } from 'lucide-react'

interface KeywordData {
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
}

interface Collection {
  id: string
  name: string
  status: string
  total_keywords: number
  created_at: string
}

export default function HomePage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    seedKeywords: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(null)
  const [keywords, setKeywords] = useState<KeywordData[]>([])
  const [isCollecting, setIsCollecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const keywords = formData.seedKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keywords.length === 0) {
        throw new Error('최소 1개의 시드키워드를 입력해주세요.')
      }

      if (keywords.length > 20) {
        throw new Error('최대 20개의 시드키워드만 입력 가능합니다.')
      }

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          seedKeywords: keywords,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '수집 세션 생성에 실패했습니다.')
      }

      const collection = await response.json()
      setCurrentCollection(collection)
      setIsCollecting(true)
      
      // 수집 시작
      await fetch(`/api/collections/${collection.id}/collect`, {
        method: 'POST',
      })

      // 폼 초기화
      setFormData({
        name: '',
        description: '',
        seedKeywords: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // 수집 상태 확인 및 키워드 데이터 가져오기
  useEffect(() => {
    if (!currentCollection) return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/collections/${currentCollection.id}/keywords`)
        if (response.ok) {
          const data = await response.json()
          setKeywords(data)
          
          if (data.length > 0) {
            setIsCollecting(false)
          }
        }
      } catch (err) {
        console.error('키워드 데이터 조회 실패:', err)
      }
    }

    const interval = setInterval(checkStatus, 3000) // 3초마다 확인
    return () => clearInterval(interval)
  }, [currentCollection])

  const exportToCSV = () => {
    if (keywords.length === 0) return

    const headers = ['키워드', 'PC 검색량', '모바일 검색량', '총 검색량', 'PC 월간 클릭수', '모바일 월간 클릭수', 'PC CTR', '모바일 CTR', '광고수', '경쟁지수']
    const csvContent = [
      headers.join(','),
      ...keywords.map(k => [
        k.keyword,
        k.pc_search,
        k.mobile_search,
        k.total_search,
        k.monthly_click_pc,
        k.monthly_click_mobile,
        k.ctr_pc,
        k.ctr_mobile,
        k.ad_count,
        k.comp_idx
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `keywords_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          네이버 키워드 파인더
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          네이버 검색광고 API를 활용해 황금키워드를 찾아보세요
        </p>
      </div>

      {/* 키워드 수집 폼 */}
      <div className="max-w-4xl mx-auto">
        <div className="card p-8">
          <div className="text-center mb-8">
            <Search className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              키워드 수집 시작
            </h2>
            <p className="text-gray-600">
              시드키워드를 입력하여 연관키워드를 수집해보세요
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  수집 세션 이름 *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="input-field"
                  placeholder="예: 여행 키워드 분석"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="input-field"
                  placeholder="수집 목적이나 특이사항"
                />
              </div>
            </div>

            <div>
              <label htmlFor="seedKeywords" className="block text-sm font-medium text-gray-700 mb-2">
                시드키워드 *
              </label>
              <textarea
                id="seedKeywords"
                value={formData.seedKeywords}
                onChange={(e) => handleInputChange('seedKeywords', e.target.value)}
                className="input-field"
                rows={3}
                placeholder="키워드를 쉼표(,)로 구분하여 입력하세요&#10;예: 강원도풀빌라, 제주도펜션, 부산호텔"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                최대 20개까지 입력 가능합니다. 각 키워드는 최대 5개의 연관키워드를 생성합니다.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    수집 시작 중...
                  </>
                ) : (
                  '키워드 수집 시작'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 수집 상태 및 결과 */}
      {currentCollection && (
        <div className="max-w-6xl mx-auto">
          <div className="card p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {currentCollection.name}
                </h3>
                <p className="text-gray-600">
                  수집된 키워드: {keywords.length}개
                </p>
              </div>
              <div className="flex space-x-4">
                {isCollecting && (
                  <div className="flex items-center text-blue-600">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>수집 중...</span>
                  </div>
                )}
                {keywords.length > 0 && (
                  <button
                    onClick={exportToCSV}
                    className="btn-secondary flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV 다운로드
                  </button>
                )}
              </div>
            </div>

            {keywords.length > 0 ? (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-medium text-primary-600">
                            {keyword.total_search.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {keyword.ctr_pc}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {keyword.ctr_mobile}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {keyword.ad_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            keyword.comp_idx === 'HIGH' ? 'bg-red-100 text-red-800' :
                            keyword.comp_idx === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {keyword.comp_idx}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isCollecting ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">키워드를 수집하고 있습니다...</p>
                <p className="text-sm text-gray-500 mt-2">
                  수집이 완료되면 결과가 자동으로 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">아직 수집된 키워드가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-center">
          <Search className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">연관키워드 수집</h3>
          <p className="text-gray-600">
            시드키워드로부터 관련 키워드를 자동으로 수집합니다
          </p>
        </div>

        <div className="card p-6 text-center">
          <BarChart3 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">상세 지표 분석</h3>
          <p className="text-gray-600">
            검색량, 클릭수, CTR, 경쟁도 등 상세한 데이터를 제공합니다
          </p>
        </div>

        <div className="card p-6 text-center">
          <Database className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">데이터 저장</h3>
          <p className="text-gray-600">
            수집한 키워드 데이터를 안전하게 저장하고 관리합니다
          </p>
        </div>

        <div className="card p-6 text-center">
          <Zap className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">빠른 처리</h3>
          <p className="text-gray-600">
            배치 처리로 대량의 키워드를 효율적으로 수집합니다
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          사용 방법
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">시드키워드 입력</h3>
            <p className="text-gray-600">
              분석하고 싶은 기본 키워드를 입력하세요
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">자동 수집</h3>
            <p className="text-gray-600">
              네이버 API를 통해 연관키워드와 지표를 수집합니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">결과 분석</h3>
            <p className="text-gray-600">
              수집된 데이터를 분석하여 황금키워드를 찾아보세요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
