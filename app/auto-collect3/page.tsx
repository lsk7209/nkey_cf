'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, RefreshCw, BarChart3, CheckCircle, AlertCircle, Clock, Target, Hash } from 'lucide-react'

interface AutoCollectStatus {
  is_running: boolean
  current_seed: string
  seeds_processed: number
  total_seeds: number
  keywords_collected: number
  start_time: string | null
  end_time: string | null
  status_message: string
  error_message: string | null
}

export default function AutoCollect3Page() {
  const [message, setMessage] = useState('')
  const [autoCollectStatus, setAutoCollectStatus] = useState<AutoCollectStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [seedCount, setSeedCount] = useState(10)
  const [keywordsPerSeed, setKeywordsPerSeed] = useState(1000)

  // 컴포넌트 마운트 시 상태 조회
  useEffect(() => {
    fetchAutoCollectStatus()
  }, [])

  // 자동수집이 실행 중일 때 3초마다 상태 새로고침
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (autoCollectStatus?.is_running) {
      interval = setInterval(() => {
        fetchAutoCollectStatus()
      }, 3000) // 3초마다 새로고침
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [autoCollectStatus?.is_running])

  // 자동수집 상태 조회
  const fetchAutoCollectStatus = async () => {
    setIsLoadingStatus(true)
    try {
      const response = await fetch('/api/auto-collect3-status')
      if (response.ok) {
        const data = await response.json()
        setAutoCollectStatus(data)
      } else {
        console.error('자동수집3 상태 조회 실패')
      }
    } catch (error) {
      console.error('자동수집3 상태 조회 오류:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  // 자동수집 중단
  const stopAutoCollect = async () => {
    setIsStopping(true)
    setMessage('자동수집 중단 중...')
    
    try {
      const response = await fetch('/api/auto-collect3-stop', {
        method: 'POST'
      })

      if (response.ok) {
        setMessage('✅ 자동수집이 중단되었습니다.')
        fetchAutoCollectStatus()
      } else {
        const errorData = await response.json()
        setMessage(`❌ 자동수집 중단 실패: ${errorData.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      setMessage('❌ 자동수집 중단 중 오류가 발생했습니다.')
      console.error('자동수집 중단 실패:', error)
    } finally {
      setIsStopping(false)
    }
  }

  // 자동수집 시작
  const startAutoCollect = async () => {
    if (seedCount < 1 || seedCount > 100) {
      setMessage('❌ 시드키워드 개수는 1-100개 사이여야 합니다.')
      return
    }

    if (keywordsPerSeed < 100 || keywordsPerSeed > 1000) {
      setMessage('❌ 시드키워드당 수집개수는 100-1000개 사이여야 합니다.')
      return
    }

    setIsStarting(true)
    setMessage('자동수집 시작 중...')

    try {
      const response = await fetch('/api/auto-collect3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          seedCount,
          keywordsPerSeed 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '자동수집에 실패했습니다.')
      }

      const data = await response.json()
      setMessage(`✅ ${data.message || '자동수집이 시작되었습니다.'}`)
      
      // 상태 새로고침
      fetchAutoCollectStatus()
      
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : '자동수집 중 오류가 발생했습니다.'}`)
      console.error('자동수집 실패:', error)
    } finally {
      setIsStarting(false)
    }
  }

  // 진행률 계산
  const getProgressPercentage = () => {
    if (!autoCollectStatus?.total_seeds) return 0
    return Math.min(
      (autoCollectStatus.seeds_processed / autoCollectStatus.total_seeds) * 100,
      100
    )
  }

  // 실행 시간 계산
  const getRunningTime = () => {
    if (!autoCollectStatus?.start_time) return '00:00:00'
    
    const startTime = new Date(autoCollectStatus.start_time)
    const now = new Date()
    const diffMs = now.getTime() - startTime.getTime()
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
          자동수집3 - 새로운 로직
        </h1>
        <p className="text-lg text-gray-600">
          시드키워드 개수를 설정하고 순차적으로 연관키워드를 수집합니다
        </p>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
          message.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* 설정 섹션 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2 text-gray-600" />
          수집 설정
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 시드키워드 개수 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              시드키워드 개수
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={seedCount}
                onChange={(e) => setSeedCount(parseInt(e.target.value) || 10)}
                min="1"
                max="100"
                className="w-24 px-3 py-2 border border-gray-300 rounded-md text-center"
              />
              <span className="text-gray-600">개</span>
            </div>
            <p className="text-xs text-gray-500">1-100개 사이로 설정</p>
          </div>

          {/* 시드키워드당 수집개수 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              시드키워드당 수집개수
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={keywordsPerSeed}
                onChange={(e) => setKeywordsPerSeed(parseInt(e.target.value) || 1000)}
                min="100"
                max="1000"
                className="w-24 px-3 py-2 border border-gray-300 rounded-md text-center"
              />
              <span className="text-gray-600">개</span>
            </div>
            <p className="text-xs text-gray-500">100-1000개 사이로 설정</p>
          </div>
        </div>

        {/* 예상 수집량 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">예상 수집량:</span>
            <span className="text-lg font-bold text-blue-900">
              {(seedCount * keywordsPerSeed).toLocaleString()}개
            </span>
          </div>
        </div>
      </div>

      {/* 자동수집 상태 */}
      {autoCollectStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            자동수집 상태
          </h2>
          
          <div className="space-y-4">
            {/* 상태 표시 */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-gray-700">현재 상태:</span>
              <span className={`px-3 py-1 text-sm rounded-full flex items-center ${
                autoCollectStatus.is_running 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {autoCollectStatus.is_running ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    실행 중
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-1" />
                    대기 중
                  </>
                )}
              </span>
            </div>

            {/* 현재 시드키워드 */}
            {autoCollectStatus.is_running && autoCollectStatus.current_seed && (
              <div>
                <span className="text-sm text-gray-600">현재 처리 중인 시드키워드:</span>
                <p className="text-lg font-medium text-blue-600 mt-1">
                  "{autoCollectStatus.current_seed}"
                </p>
              </div>
            )}

            {/* 상태 메시지 */}
            <div>
              <span className="text-sm text-gray-600">상태 메시지:</span>
              <p className="text-gray-800 mt-1">{autoCollectStatus.status_message}</p>
            </div>

            {/* 진행률 */}
            {autoCollectStatus.is_running && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>진행률: {autoCollectStatus.seeds_processed} / {autoCollectStatus.total_seeds} 시드</span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {getRunningTime()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>수집된 키워드: {autoCollectStatus.keywords_collected.toLocaleString()}개</span>
                  <span>{getProgressPercentage().toFixed(1)}% 완료</span>
                </div>
              </div>
            )}

            {/* 오류 메시지 */}
            {autoCollectStatus.error_message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  오류: {autoCollectStatus.error_message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 자동수집 제어 버튼 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">자동수집 제어</h2>
        
        <div className="flex justify-center space-x-4">
          {autoCollectStatus?.is_running ? (
            <button
              onClick={stopAutoCollect}
              disabled={isStopping}
              className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-lg font-medium"
            >
              <Pause className="w-6 h-6" />
              <span>{isStopping ? '중단 중...' : '자동수집 중단'}</span>
            </button>
          ) : (
            <button
              onClick={startAutoCollect}
              disabled={isStarting}
              className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-lg font-medium"
            >
              <Play className="w-6 h-6" />
              <span>{isStarting ? '시작 중...' : '자동수집 시작'}</span>
            </button>
          )}
          
          <button
            onClick={fetchAutoCollectStatus}
            disabled={isLoadingStatus}
            className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-lg font-medium"
          >
            <RefreshCw className={`w-6 h-6 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>{isLoadingStatus ? '새로고침 중...' : '상태 새로고침'}</span>
          </button>
        </div>
      </div>

      {/* 동작 방식 안내 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">동작 방식</h2>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
            <p className="text-gray-700">기존 수집된 키워드 중 검색량이 높은 순으로 시드키워드를 선택합니다.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <p className="text-gray-700">각 시드키워드당 최대 1000개의 연관키워드를 수집합니다.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <p className="text-gray-700">시드키워드를 순차적으로 순회하며 모든 시드키워드 처리가 완료되면 자동으로 중단됩니다.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
            <p className="text-gray-700">실시간으로 진행 상황을 모니터링할 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
