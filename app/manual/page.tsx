'use client'

import { useState } from 'react'
import { Search, Loader2, AlertCircle, Download, RefreshCw } from 'lucide-react'

interface KeywordData {
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

export default function ManualCollectPage() {
  const [seedKeywords, setSeedKeywords] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [keywords, setKeywords] = useState<KeywordData[]>([])
  const [isCollecting, setIsCollecting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setKeywords([])
    setIsCollecting(true)

    try {
      const keywordList = seedKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keywordList.length === 0) {
        throw new Error('최소 1개의 시드키워드를 입력해주세요.')
      }

      if (keywordList.length > 10) {
        throw new Error('수동수집은 최대 10개의 시드키워드만 지원합니다.')
      }

      setProgress({ current: 0, total: keywordList.length })
      const allKeywords: KeywordData[] = []

      // 각 시드키워드에 대해 연관키워드 수집
      for (let i = 0; i < keywordList.length; i++) {
        const seedKeyword = keywordList[i]
        setProgress({ current: i + 1, total: keywordList.length })

        try {
          // 네이버 API를 통해 연관키워드 수집
          const response = await fetch('/api/manual-collect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ seedKeyword }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || '키워드 수집에 실패했습니다.')
          }

          const data = await response.json()
          allKeywords.push(...data.keywords)
          
          // 실시간으로 결과 업데이트
          setKeywords([...allKeywords])
          
          // API 제한을 고려한 대기 (429 에러 방지)
          if (i < keywordList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (err) {
          console.error(`키워드 "${seedKeyword}" 수집 실패:`, err)
          // 개별 키워드 실패는 전체를 중단하지 않음
        }
      }

      // 검색량 기준으로 정렬
      allKeywords.sort((a, b) => b.total_search - a.total_search)
      setKeywords(allKeywords)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
      setIsCollecting(false)
    }
  }

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
    link.setAttribute('download', `manual_keywords_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetForm = () => {
    setSeedKeywords('')
    setKeywords([])
    setError('')
    setIsCollecting(false)
    setProgress({ current: 0, total: 0 })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          수동 키워드 수집
        </h1>
        <p className="text-lg text-gray-600">
          시드키워드를 입력하면 즉시 연관키워드와 상세 지표를 확인할 수 있습니다
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="card p-8">
        <div className="text-center mb-8">
          <Search className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            시드키워드 입력
          </h2>
          <p className="text-gray-600">
            쉼표(,)로 구분하여 최대 10개의 키워드를 입력하세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="seedKeywords" className="block text-sm font-medium text-gray-700 mb-2">
              시드키워드 *
            </label>
            <textarea
              id="seedKeywords"
              value={seedKeywords}
              onChange={(e) => setSeedKeywords(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="키워드를 쉼표(,)로 구분하여 입력하세요&#10;예: 강원도풀빌라, 제주도펜션, 부산호텔"
              required
              disabled={isLoading}
            />
            <p className="mt-2 text-sm text-gray-500">
              최대 10개까지 입력 가능합니다. 각 키워드당 최대 5개의 연관키워드를 수집합니다.
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              초기화
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  수집 중...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  키워드 수집 시작
                </>
              )}
            </button>
          </div>
        </form>

        {/* 진행률 표시 */}
        {isCollecting && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                수집 진행률
              </span>
              <span className="text-sm text-blue-600">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 결과 테이블 */}
      {keywords.length > 0 && (
        <div className="card p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                수집 결과
              </h3>
              <p className="text-gray-600">
                총 {keywords.length}개의 키워드가 수집되었습니다
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV 다운로드
            </button>
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
                {keywords.map((keyword, index) => (
                  <tr key={index} className="hover:bg-gray-50">
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
        </div>
      )}

      {/* 사용 팁 */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 수동수집 팁</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 수동수집은 실시간으로 결과를 확인할 수 있어 빠른 분석에 적합합니다</li>
          <li>• API 제한으로 인해 한 번에 최대 10개의 시드키워드만 처리 가능합니다</li>
          <li>• 각 키워드 수집 간 1초 대기로 API 제한을 방지합니다</li>
          <li>• 결과는 검색량 기준으로 자동 정렬됩니다</li>
          <li>• 수집된 데이터는 브라우저에서만 저장되며 새로고침 시 사라집니다</li>
        </ul>
      </div>
    </div>
  )
}
