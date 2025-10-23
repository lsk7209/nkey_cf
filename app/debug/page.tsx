'use client'

import { useState, useEffect } from 'react'
import { Database, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface DebugInfo {
  kvStatus: any
  apiStatus: any
  dataCount: number
  error?: string
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const fetchDebugInfo = async () => {
    try {
      setLoading(true)
      
      // KV 상태 확인
      const kvResponse = await fetch('/api/kv-health')
      const kvStatus = kvResponse.ok ? await kvResponse.json() : null
      
      // API 키 상태 확인
      const apiResponse = await fetch('/api/test-keys')
      const apiStatus = apiResponse.ok ? await apiResponse.json() : null
      
      // 데이터 로드 테스트
      let dataCount = 0
      let dataError = null
      try {
        const dataResponse = await fetch('/api/load-data?page=1&pageSize=10')
        if (dataResponse.ok) {
          const dataResult = await dataResponse.json()
          dataCount = dataResult.total || 0
        } else {
          dataError = `데이터 로드 실패: ${dataResponse.status}`
        }
      } catch (error) {
        dataError = `데이터 로드 오류: ${error}`
      }
      
      setDebugInfo({
        kvStatus,
        apiStatus,
        dataCount,
        error: dataError
      })
    } catch (error) {
      setDebugInfo({
        kvStatus: null,
        apiStatus: null,
        dataCount: 0,
        error: `디버그 정보 수집 실패: ${error}`
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">디버그 정보를 수집하는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 디버그</h1>
          <p className="text-gray-600">시스템 상태 및 데이터 접근성 확인</p>
        </div>

        {debugInfo && (
          <div className="space-y-6">
            {/* KV 상태 */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">KV 스토리지 상태</h2>
              </div>
              
              {debugInfo.kvStatus ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">KV 스토리지 연결됨</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>사용 가능: {debugInfo.kvStatus.available ? '예' : '아니오'}</p>
                    <p>타입: {debugInfo.kvStatus.type}</p>
                    <p>메서드: {debugInfo.kvStatus.methods?.length || 0}개</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">KV 스토리지 연결 실패</span>
                </div>
              )}
            </div>

            {/* API 키 상태 */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
                <h2 className="text-xl font-semibold">API 키 상태</h2>
              </div>
              
              {debugInfo.apiStatus ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">API 키 설정됨</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>SearchAd 키: {debugInfo.apiStatus.searchadKeys ? '설정됨' : '없음'}</p>
                    <p>OpenAPI 키: {debugInfo.apiStatus.openapiKeys ? '설정됨' : '없음'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">API 키 확인 실패</span>
                </div>
              )}
            </div>

            {/* 데이터 상태 */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-semibold">데이터 상태</h2>
              </div>
              
              {debugInfo.error ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700">데이터 로드 실패</span>
                  </div>
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {debugInfo.error}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">데이터 로드 성공</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>총 키워드 수: {debugInfo.dataCount.toLocaleString()}개</p>
                  </div>
                </div>
              )}
            </div>

            {/* 새로고침 버튼 */}
            <div className="flex justify-center">
              <button
                onClick={fetchDebugInfo}
                className="btn-primary"
              >
                새로고침
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}