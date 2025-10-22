'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Bug, RefreshCw } from 'lucide-react'

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
  }>
  openApiKeys: Array<{
    id: number
    hasClientId: boolean
    hasClientSecret: boolean
    clientIdLength: number
    clientSecretLength: number
  }>
  message: string
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

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
        ) : debugInfo ? (
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        ) : null}
      </main>
    </div>
  )
}
