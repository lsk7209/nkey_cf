'use client'

import { useState, useEffect } from 'react'
import { Database, AlertCircle, CheckCircle, XCircle, Play, Square, RefreshCw } from 'lucide-react'

interface DebugInfo {
  kvStatus: any
  apiStatus: any
  dataCount: number
  error?: string | null
}

interface AutoCollectLog {
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  details?: any
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoCollectLogs, setAutoCollectLogs] = useState<AutoCollectLog[]>([])
  const [isAutoCollecting, setIsAutoCollecting] = useState(false)
  const [autoCollectStatus, setAutoCollectStatus] = useState<any>(null)
  const [logPolling, setLogPolling] = useState(false)

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  // 자동수집 상태 폴링
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (logPolling) {
      interval = setInterval(async () => {
        await checkAutoCollectStatus()
      }, 2000) // 2초마다 상태 확인
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [logPolling])

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

  // 자동수집 상태 확인
  const checkAutoCollectStatus = async () => {
    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      })

      if (response.ok) {
        const result = await response.json()
        setAutoCollectStatus(result)
        setIsAutoCollecting(result.isRunning || false)

        // 로그 추가
        if (result.isRunning) {
          const log: AutoCollectLog = {
        timestamp: new Date().toISOString(),
            level: 'info',
            message: `자동수집 진행 중: ${result.currentKeywordIndex || 0}/${result.totalKeywords || 0}`,
            details: result
          }
          setAutoCollectLogs(prev => [...prev.slice(-49), log]) // 최대 50개 로그 유지
        }
      }
    } catch (error) {
      console.error('자동수집 상태 확인 오류:', error)
    }
  }

  // 자동수집 시작
  const startAutoCollect = async () => {
    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start', 
          maxKeywords: 5 
        })
      })

      if (response.ok) {
        const result = await response.json()
        const log: AutoCollectLog = {
            timestamp: new Date().toISOString(),
          level: 'success',
          message: `자동수집 시작: ${result.message}`,
          details: result
        }
        setAutoCollectLogs(prev => [...prev.slice(-49), log])
        setLogPolling(true)
      } else {
        const error = await response.text()
        const log: AutoCollectLog = {
              timestamp: new Date().toISOString(),
          level: 'error',
          message: `자동수집 시작 실패: ${error}`,
          details: { status: response.status }
        }
        setAutoCollectLogs(prev => [...prev.slice(-49), log])
      }
    } catch (error) {
      const log: AutoCollectLog = {
              timestamp: new Date().toISOString(),
        level: 'error',
        message: `자동수집 시작 오류: ${error}`,
        details: { error: String(error) }
      }
      setAutoCollectLogs(prev => [...prev.slice(-49), log])
    }
  }

  // 자동수집 중지
  const stopAutoCollect = async () => {
    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })

      if (response.ok) {
        const result = await response.json()
        const log: AutoCollectLog = {
              timestamp: new Date().toISOString(),
          level: 'warning',
          message: `자동수집 중지: ${result.message}`,
          details: result
        }
        setAutoCollectLogs(prev => [...prev.slice(-49), log])
        setLogPolling(false)
        setIsAutoCollecting(false)
      }
    } catch (error) {
      const log: AutoCollectLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `자동수집 중지 오류: ${error}`,
        details: { error: String(error) }
      }
      setAutoCollectLogs(prev => [...prev.slice(-49), log])
    }
  }

  // 로그 클리어
  const clearLogs = () => {
    setAutoCollectLogs([])
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
                    <p>SearchAd 키: {debugInfo.apiStatus.totalSearchAdKeys || 0}개 설정됨</p>
                    <p>OpenAPI 키: {debugInfo.apiStatus.totalOpenApiKeys || 0}개 설정됨</p>
                    {debugInfo.apiStatus.searchAdKeys && debugInfo.apiStatus.searchAdKeys.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">SearchAd 키 상세:</p>
                        {debugInfo.apiStatus.searchAdKeys.map((key: any, index: number) => (
                          <p key={index} className="ml-2 text-xs">
                            키 {key.id}: {key.hasLicense && key.hasSecret && key.hasCustomer ? '완전 설정' : '부분 설정'}
                          </p>
                        ))}
                      </div>
                    )}
                    {debugInfo.apiStatus.openApiKeys && debugInfo.apiStatus.openApiKeys.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">OpenAPI 키 상세:</p>
                        {debugInfo.apiStatus.openApiKeys.map((key: any, index: number) => (
                          <p key={index} className="ml-2 text-xs">
                            키 {key.id}: {key.hasClientId && key.hasClientSecret ? '완전 설정' : '부분 설정'}
                          </p>
                        ))}
                      </div>
                    )}
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

            {/* 자동수집 로그 섹션 */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-semibold">자동수집 로그</h2>
              </div>

              {/* 자동수집 컨트롤 */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={startAutoCollect}
                  disabled={isAutoCollecting}
                  className="btn-success flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  자동수집 시작
                </button>
                <button
                  onClick={stopAutoCollect}
                  disabled={!isAutoCollecting}
                  className="btn-danger flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  자동수집 중지
                </button>
                <button
                  onClick={clearLogs}
                  className="btn-secondary flex items-center gap-2"
                >
                  로그 클리어
                </button>
              </div>

              {/* 자동수집 상태 */}
              {autoCollectStatus && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <p><strong>상태:</strong> {autoCollectStatus.isRunning ? '실행 중' : '중지됨'}</p>
                    {autoCollectStatus.isRunning && (
                      <>
                        <p><strong>진행률:</strong> {autoCollectStatus.currentKeywordIndex || 0}/{autoCollectStatus.totalKeywords || 0}</p>
                        <p><strong>현재 키워드:</strong> {autoCollectStatus.currentKeyword || 'N/A'}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 로그 표시 */}
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {autoCollectLogs.length === 0 ? (
                  <div className="text-gray-500">로그가 없습니다. 자동수집을 시작해보세요.</div>
                ) : (
                  autoCollectLogs.map((log, index) => (
                    <div key={index} className="mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.level === 'success' ? 'bg-green-900 text-green-300' :
                          log.level === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                          log.level === 'error' ? 'bg-red-900 text-red-300' :
                          'bg-blue-900 text-blue-300'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-2">{log.message}</div>
                      {log.details && (
                        <div className="ml-4 text-xs text-gray-400">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
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
