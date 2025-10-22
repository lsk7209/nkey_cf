'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Key } from 'lucide-react'

interface KeyStatus {
  searchAdKeys: Array<{
    id: number
    hasLicense: boolean
    hasSecret: boolean
    hasCustomer: boolean
  }>
  openApiKeys: Array<{
    id: number
    hasClientId: boolean
    hasClientSecret: boolean
  }>
  totalSearchAdKeys: number
  totalOpenApiKeys: number
}

export default function ApiStatusPage() {
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchKeyStatus()
  }, [])

  const fetchKeyStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/test-keys')
      
      if (!response.ok) {
        throw new Error('API 키 상태를 불러올 수 없습니다.')
      }
      
      const data = await response.json()
      setKeyStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 키 상태 확인 중 오류가 발생했습니다.')
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
              <Key className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">API 키 상태</h1>
            </div>
            <nav className="flex space-x-4">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                홈으로
              </a>
              <a href="/data" className="text-gray-600 hover:text-gray-900">
                데이터
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">API 키 상태를 확인하는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchKeyStatus}
              className="mt-4 btn-primary"
            >
              다시 시도
            </button>
          </div>
        ) : keyStatus ? (
          <div className="space-y-6">
            {/* 요약 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {keyStatus.totalSearchAdKeys}
                </div>
                <div className="text-sm text-gray-500">SearchAd API 키</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-green-600">
                  {keyStatus.totalOpenApiKeys}
                </div>
                <div className="text-sm text-gray-500">OpenAPI 키</div>
              </div>
            </div>

            {/* SearchAd API 키 상세 */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                SearchAd API 키 상태
              </h2>
              {keyStatus.searchAdKeys.length === 0 ? (
                <p className="text-gray-500">설정된 SearchAd API 키가 없습니다.</p>
              ) : (
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
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {keyStatus.searchAdKeys.map((key) => (
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
                            {key.hasLicense && key.hasSecret && key.hasCustomer ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                완전 설정
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                부분 설정
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* OpenAPI 키 상세 */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                OpenAPI 키 상태
              </h2>
              {keyStatus.openApiKeys.length === 0 ? (
                <p className="text-gray-500">설정된 OpenAPI 키가 없습니다.</p>
              ) : (
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
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {keyStatus.openApiKeys.map((key) => (
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
                            {key.hasClientId && key.hasClientSecret ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                완전 설정
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                부분 설정
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 새로고침 버튼 */}
            <div className="text-center">
              <button
                onClick={fetchKeyStatus}
                className="btn-primary"
              >
                상태 새로고침
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
