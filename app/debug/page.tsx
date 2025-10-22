'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Bug, RefreshCw, Search, Database, Eye, Code } from 'lucide-react'

interface DebugInfo {
  timestamp: string
  environment: string
  availableSearchAdKeys: number
  availableOpenApiKeys: number
  searchAdKeys: Array<{
    id: number
    hasLicense: boolean
    hasSecret: boolean
    hasCustomer: boolean
    licenseLength: number
    secretLength: number
    customerLength: number
    licensePreview: string
    secretPreview: string
    customerPreview: string
  }>
  openApiKeys: Array<{
    id: number
    hasClientId: boolean
    hasClientSecret: boolean
    clientIdLength: number
    clientSecretLength: number
    clientIdPreview: string
    clientSecretPreview: string
  }>
  apiTestResults: {
    searchAdTest: {
      status?: number
      statusText?: string
      success: boolean
      responseText?: string
      error?: string
    } | null
    openApiTest: {
      status?: number
      statusText?: string
      success: boolean
      responseText?: string
      error?: string
    } | null
  }
  message: string
}

interface ProcessingLog {
  timestamp: string
  keyword: string
  step: string
  data: any
  error?: string
  success: boolean
}

interface DataAnalysis {
  rawSearchAdData: any
  rawOpenApiData: any
  normalizedData: any
  processingSteps: ProcessingLog[]
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [testKeyword, setTestKeyword] = useState('')
  const [processingData, setProcessingData] = useState<DataAnalysis | null>(null)
  const [processingLoading, setProcessingLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'processing' | 'data-analysis'>('overview')

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const fetchDebugInfo = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/debug-logs')
      
      if (!response.ok) {
        throw new Error(`디버그 정보를 불러올 수 없습니다. (${response.status})`)
      }
      
      const data = await response.json()
      setDebugInfo(data)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : '디버그 정보 확인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const testKeywordProcessing = async () => {
    if (!testKeyword.trim()) {
      setError('테스트할 키워드를 입력해주세요.')
      return
    }

    setProcessingLoading(true)
    setError('')
    setProcessingData(null)

    try {
      const processingSteps: ProcessingLog[] = []
      
      // Step 1: SearchAd API 호출
      processingSteps.push({
        timestamp: new Date().toISOString(),
        keyword: testKeyword,
        step: 'SearchAd API 호출 시작',
        data: { keyword: testKeyword },
        success: true
      })

      const searchAdResponse = await fetch('/api/searchad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [testKeyword] })
      })

      const searchAdData = await searchAdResponse.json()
      
      processingSteps.push({
        timestamp: new Date().toISOString(),
        keyword: testKeyword,
        step: 'SearchAd API 응답 수신',
        data: {
          status: searchAdResponse.status,
          data: searchAdData
        },
        success: searchAdResponse.ok
      })

      // Step 2: OpenAPI 호출
      processingSteps.push({
        timestamp: new Date().toISOString(),
        keyword: testKeyword,
        step: 'OpenAPI 호출 시작',
        data: { keyword: testKeyword },
        success: true
      })

      const openApiResponse = await fetch('/api/openapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: testKeyword })
      })

      const openApiData = await openApiResponse.json()
      
      processingSteps.push({
        timestamp: new Date().toISOString(),
        keyword: testKeyword,
        step: 'OpenAPI 응답 수신',
        data: {
          status: openApiResponse.status,
          data: openApiData
        },
        success: openApiResponse.ok
      })

      // Step 3: 데이터 정규화 과정 상세 분석
      if (searchAdData.keywordList && Array.isArray(searchAdData.keywordList)) {
        const normalizedData = []
        
        for (let i = 0; i < searchAdData.keywordList.length; i++) {
          const item = searchAdData.keywordList[i]
          
          processingSteps.push({
            timestamp: new Date().toISOString(),
            keyword: testKeyword,
            step: `키워드 ${i + 1} 정규화 시작`,
            data: { originalItem: item },
            success: true
          })

          try {
            // 검색량 정규화 과정 상세 로깅
            const pcSearchValue = item.monthlyPcQcCnt || 0
            const mobileSearchValue = item.monthlyMobileQcCnt || 0
            
            processingSteps.push({
              timestamp: new Date().toISOString(),
              keyword: testKeyword,
              step: `키워드 ${i + 1} PC 검색량 처리`,
              data: {
                originalValue: pcSearchValue,
                type: typeof pcSearchValue,
                isString: typeof pcSearchValue === 'string',
                hasReplace: typeof pcSearchValue === 'string' && typeof pcSearchValue.replace === 'function'
              },
              success: true
            })

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

            processingSteps.push({
              timestamp: new Date().toISOString(),
              keyword: testKeyword,
              step: `키워드 ${i + 1} 모바일 검색량 처리`,
              data: {
                originalValue: mobileSearchValue,
                type: typeof mobileSearchValue,
                isString: typeof mobileSearchValue === 'string',
                hasReplace: typeof mobileSearchValue === 'string' && typeof mobileSearchValue.replace === 'function'
              },
              success: true
            })

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

            // 문서수 계산
            const totalDocs = openApiData.blog + openApiData.cafe + openApiData.news + openApiData.web
            const potentialScore = ((pcSearch + mobileSearch) / Math.max(totalDocs, 1)) * 100

            const normalizedItem = {
              rel_keyword: item.relKeyword || '',
              pc_search: pcSearch,
              mobile_search: mobileSearch,
              total_search: pcSearch + mobileSearch,
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
              seed_usage: 'N/A',
              source: 'fresh' as const
            }

            normalizedData.push(normalizedItem)

            processingSteps.push({
              timestamp: new Date().toISOString(),
              keyword: testKeyword,
              step: `키워드 ${i + 1} 정규화 완료`,
              data: { normalizedItem },
              success: true
            })

          } catch (normalizeError) {
            processingSteps.push({
              timestamp: new Date().toISOString(),
              keyword: testKeyword,
              step: `키워드 ${i + 1} 정규화 오류`,
              data: { originalItem: item },
              error: normalizeError instanceof Error ? normalizeError.message : '알 수 없는 오류',
              success: false
            })
          }
        }

        setProcessingData({
          rawSearchAdData: searchAdData,
          rawOpenApiData: openApiData,
          normalizedData: normalizedData,
          processingSteps: processingSteps
        })
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '키워드 처리 테스트 중 오류가 발생했습니다.')
    } finally {
      setProcessingLoading(false)
    }
  }

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusText = (isValid: boolean) => {
    return isValid ? '설정됨' : '미설정'
  }

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bug className="h-8 w-8 text-red-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">디버그 정보</h1>
            </div>
            <nav className="flex space-x-4">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                홈으로
              </a>
              <a href="/api-status" className="text-gray-600 hover:text-gray-900">
                API 상태
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bug className="inline h-4 w-4 mr-2" />
              시스템 개요
            </button>
            <button
              onClick={() => setActiveTab('processing')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'processing'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Search className="inline h-4 w-4 mr-2" />
              키워드 처리 테스트
            </button>
            <button
              onClick={() => setActiveTab('data-analysis')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data-analysis'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Code className="inline h-4 w-4 mr-2" />
              데이터 분석
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">디버그 정보를 확인하는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchDebugInfo}
              className="mt-4 btn-primary"
            >
              다시 시도
            </button>
          </div>
        ) : activeTab === 'overview' && debugInfo ? (
          <div className="space-y-6">
            {/* 요약 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {debugInfo.availableSearchAdKeys}
                </div>
                <div className="text-sm text-gray-500">사용 가능한 SearchAd 키</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-green-600">
                  {debugInfo.availableOpenApiKeys}
                </div>
                <div className="text-sm text-gray-500">사용 가능한 OpenAPI 키</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-gray-500">
                  {lastUpdate?.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">마지막 업데이트</div>
              </div>
            </div>

            {/* 환경 정보 */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                환경 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">타임스탬프:</span>
                  <span className="ml-2 text-gray-600">{debugInfo.timestamp}</span>
                </div>
                <div>
                  <span className="font-medium">환경:</span>
                  <span className="ml-2 text-gray-600">{debugInfo.environment}</span>
                </div>
              </div>
            </div>

            {/* SearchAd API 키 상세 */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                SearchAd API 키 상세
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        키 ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Access License
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Secret Key
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        길이 정보
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {debugInfo.searchAdKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {key.id}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {getStatusIcon(key.hasLicense)}
                            <span className={`ml-2 ${getStatusColor(key.hasLicense)}`}>
                              {getStatusText(key.hasLicense)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {getStatusIcon(key.hasSecret)}
                            <span className={`ml-2 ${getStatusColor(key.hasSecret)}`}>
                              {getStatusText(key.hasSecret)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {getStatusIcon(key.hasCustomer)}
                            <span className={`ml-2 ${getStatusColor(key.hasCustomer)}`}>
                              {getStatusText(key.hasCustomer)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="text-xs text-gray-500">
                            License: {key.licenseLength}자<br/>
                            Secret: {key.secretLength}자<br/>
                            Customer: {key.customerLength}자
                          </div>
                          {key.hasLicense && (
                            <div className="text-xs text-gray-400 mt-1">
                              License: {key.licensePreview}
                            </div>
                          )}
                          {key.hasSecret && (
                            <div className="text-xs text-gray-400">
                              Secret: {key.secretPreview}
                            </div>
                          )}
                          {key.hasCustomer && (
                            <div className="text-xs text-gray-400">
                              Customer: {key.customerPreview}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* OpenAPI 키 상세 */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                OpenAPI 키 상세
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        키 ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Secret
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        길이 정보
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {debugInfo.openApiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {key.id}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {getStatusIcon(key.hasClientId)}
                            <span className={`ml-2 ${getStatusColor(key.hasClientId)}`}>
                              {getStatusText(key.hasClientId)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {getStatusIcon(key.hasClientSecret)}
                            <span className={`ml-2 ${getStatusColor(key.hasClientSecret)}`}>
                              {getStatusText(key.hasClientSecret)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="text-xs text-gray-500">
                            Client ID: {key.clientIdLength}자<br/>
                            Client Secret: {key.clientSecretLength}자
                          </div>
                          {key.hasClientId && (
                            <div className="text-xs text-gray-400 mt-1">
                              Client ID: {key.clientIdPreview}
                            </div>
                          )}
                          {key.hasClientSecret && (
                            <div className="text-xs text-gray-400">
                              Client Secret: {key.clientSecretPreview}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* API 테스트 결과 */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                API 테스트 결과
              </h2>
              
              {/* SearchAd API 테스트 */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-800 mb-2">SearchAd API 테스트</h3>
                {debugInfo.apiTestResults.searchAdTest ? (
                  <div className={`p-4 rounded-lg ${debugInfo.apiTestResults.searchAdTest.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center mb-2">
                      {debugInfo.apiTestResults.searchAdTest.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <span className={`font-medium ${debugInfo.apiTestResults.searchAdTest.success ? 'text-green-800' : 'text-red-800'}`}>
                        {debugInfo.apiTestResults.searchAdTest.success ? '성공' : '실패'}
                      </span>
                    </div>
                    {debugInfo.apiTestResults.searchAdTest.status && (
                      <div className="text-sm text-gray-600 mb-2">
                        상태: {debugInfo.apiTestResults.searchAdTest.status} {debugInfo.apiTestResults.searchAdTest.statusText}
                      </div>
                    )}
                    {debugInfo.apiTestResults.searchAdTest.error && (
                      <div className="text-sm text-red-600 mb-2">
                        오류: {debugInfo.apiTestResults.searchAdTest.error}
                      </div>
                    )}
                    {debugInfo.apiTestResults.searchAdTest.responseText && (
                      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        <pre>{debugInfo.apiTestResults.searchAdTest.responseText}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">테스트되지 않음</div>
                )}
              </div>

              {/* OpenAPI 테스트 */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-2">OpenAPI 테스트</h3>
                {debugInfo.apiTestResults.openApiTest ? (
                  <div className={`p-4 rounded-lg ${debugInfo.apiTestResults.openApiTest.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center mb-2">
                      {debugInfo.apiTestResults.openApiTest.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <span className={`font-medium ${debugInfo.apiTestResults.openApiTest.success ? 'text-green-800' : 'text-red-800'}`}>
                        {debugInfo.apiTestResults.openApiTest.success ? '성공' : '실패'}
                      </span>
                    </div>
                    {debugInfo.apiTestResults.openApiTest.status && (
                      <div className="text-sm text-gray-600 mb-2">
                        상태: {debugInfo.apiTestResults.openApiTest.status} {debugInfo.apiTestResults.openApiTest.statusText}
                      </div>
                    )}
                    {debugInfo.apiTestResults.openApiTest.error && (
                      <div className="text-sm text-red-600 mb-2">
                        오류: {debugInfo.apiTestResults.openApiTest.error}
                      </div>
                    )}
                    {debugInfo.apiTestResults.openApiTest.responseText && (
                      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        <pre>{debugInfo.apiTestResults.openApiTest.responseText}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">테스트되지 않음</div>
                )}
              </div>
            </div>

            {/* 새로고침 버튼 */}
            <div className="text-center">
              <button
                onClick={fetchDebugInfo}
                className="btn-primary flex items-center mx-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                디버그 정보 새로고침
              </button>
            </div>
          </div>
        ) : activeTab === 'processing' ? (
          <div className="space-y-6">
            {/* 키워드 처리 테스트 섹션 */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                키워드 처리 테스트
              </h2>
              <p className="text-gray-600 mb-4">
                특정 키워드에 대해 API 호출부터 데이터 정규화까지의 전체 과정을 상세히 분석합니다.
              </p>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="테스트할 키워드를 입력하세요 (예: 마케팅)"
                    value={testKeyword}
                    onChange={(e) => setTestKeyword(e.target.value)}
                    className="input-field"
                    onKeyPress={(e) => e.key === 'Enter' && testKeywordProcessing()}
                  />
                </div>
                <button
                  onClick={testKeywordProcessing}
                  disabled={processingLoading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  {processingLoading ? '처리중...' : '테스트 시작'}
                </button>
              </div>

              {processingData && (
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-800">처리 결과 요약</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">처리 단계</div>
                      <div className="text-2xl font-bold text-blue-800">
                        {processingData.processingSteps.length}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">성공 단계</div>
                      <div className="text-2xl font-bold text-green-800">
                        {processingData.processingSteps.filter(step => step.success).length}
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-sm text-red-600 font-medium">실패 단계</div>
                      <div className="text-2xl font-bold text-red-800">
                        {processingData.processingSteps.filter(step => !step.success).length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 처리 단계 상세 로그 */}
            {processingData && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  처리 단계 상세 로그
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {processingData.processingSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        step.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {step.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className="font-medium text-sm">
                            {step.step}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {step.error && (
                        <div className="text-sm text-red-600 mb-2">
                          오류: {step.error}
                        </div>
                      )}
                      
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          데이터 상세 보기
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'data-analysis' && processingData ? (
          <div className="space-y-6">
            {/* 원본 데이터 분석 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                SearchAd API 원본 데이터
              </h3>
              <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-64">
                <pre className="text-xs">
                  {JSON.stringify(processingData.rawSearchAdData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                OpenAPI 원본 데이터
              </h3>
              <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-64">
                <pre className="text-xs">
                  {JSON.stringify(processingData.rawOpenApiData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                정규화된 데이터
              </h3>
              <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-64">
                <pre className="text-xs">
                  {JSON.stringify(processingData.normalizedData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
