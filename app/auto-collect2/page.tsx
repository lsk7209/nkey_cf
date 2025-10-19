'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, RefreshCw, BarChart3, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface AutoCollectStatus {
  is_running: boolean
  target_count: number
  current_count: number
  seeds_used: number
  start_time: string | null
  end_time: string | null
  status_message: string
  error_message: string | null
}

interface AutoCollectData {
  autoCollectStatus: AutoCollectStatus
  statistics: {
    totalKeywords: number
    availableSeeds: number
    usedSeeds: number
    usageRate: string
  }
}

export default function AutoCollect2Page() {
  const [message, setMessage] = useState('')
  const [autoCollectData, setAutoCollectData] = useState<AutoCollectData | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [targetCount, setTargetCount] = useState(1000)

  // 컴포넌트 마운트 시 상태 조회
  useEffect(() => {
    fetchAutoCollectStatus()
  }, [])

  // 자동수집이 실행 중일 때 5초마다 상태 새로고침
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (autoCollectData?.autoCollectStatus.is_running) {
      interval = setInterval(() => {
        fetchAutoCollectStatus()
      }, 5000)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [autoCollectData?.autoCollectStatus.is_running])

  // 자동수집 상태 조회
  const fetchAutoCollectStatus = async () => {
    setIsLoadingStatus(true)
    try {
      const response = await fetch('/api/auto-collect-status')
      if (response.ok) {
        const data = await response.json()
        setAutoCollectData(data)
      } else {
        console.error('자동수집 상태 조회 실패')
      }
    } catch (error) {
      console.error('자동수집 상태 조회 오류:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  // 자동수집 중단
  const stopAutoCollect = async () => {
    setIsStopping(true)
    setMessage('자동수집 중단 중...')
    
    try {
      const response = await fetch('/api/auto-collect-stop', {
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

  // 자동수집 재시작
  const restartAutoCollect = async () => {
    setIsRestarting(true)
    setMessage('자동수집 재시작 중...')
    
    try {
      const response = await fetch('/api/auto-collect-restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetCount }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(`✅ ${data.message || '자동수집이 재시작되었습니다.'}`)
        fetchAutoCollectStatus()
      } else {
        const errorData = await response.json()
        setMessage(`❌ 자동수집 재시작 실패: ${errorData.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      setMessage('❌ 자동수집 재시작 중 오류가 발생했습니다.')
      console.error('자동수집 재시작 실패:', error)
    } finally {
      setIsRestarting(false)
    }
  }

  // 자동수집 시작
  const startAutoCollect = async () => {
    setIsStarting(true)
    setMessage('자동수집 시작 중...')

    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetCount }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '자동수집에 실패했습니다.')
      }

      const data = await response.json()
      setMessage(`✅ ${data.message || '자동수집이 백그라운드에서 시작되었습니다.'}`)
      
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
    if (!autoCollectData?.autoCollectStatus.target_count) return 0
    return Math.min(
      (autoCollectData.autoCollectStatus.current_count / autoCollectData.autoCollectStatus.target_count) * 100,
      100
    )
  }

  // 실행 시간 계산
  const getRunningTime = () => {
    if (!autoCollectData?.autoCollectStatus.start_time) return '00:00:00'
    
    const startTime = new Date(autoCollectData.autoCollectStatus.start_time)
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
          자동수집2 - 간단 버전
        </h1>
        <p className="text-lg text-gray-600">
          자동수집 기능에만 집중한 심플한 인터페이스
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

      {/* 목표 수집개수 설정 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">목표 수집개수</h2>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            value={targetCount}
            onChange={(e) => setTargetCount(parseInt(e.target.value) || 1000)}
            min="100"
            max="10000"
            className="w-32 px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-medium"
          />
          <span className="text-gray-600">개</span>
        </div>
      </div>

      {/* 자동수집 상태 */}
      {autoCollectData && (
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
                autoCollectData.autoCollectStatus.is_running 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {autoCollectData.autoCollectStatus.is_running ? (
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

            {/* 상태 메시지 */}
            <div>
              <span className="text-sm text-gray-600">상태 메시지:</span>
              <p className="text-gray-800 mt-1">{autoCollectData.autoCollectStatus.status_message}</p>
            </div>

            {/* 진행률 */}
            {autoCollectData.autoCollectStatus.is_running && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>진행률: {autoCollectData.autoCollectStatus.current_count} / {autoCollectData.autoCollectStatus.target_count}</span>
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
                  <span>{autoCollectData.autoCollectStatus.seeds_used}개 시드 활용</span>
                  <span>{getProgressPercentage().toFixed(1)}% 완료</span>
                </div>
              </div>
            )}

            {/* 오류 메시지 */}
            {autoCollectData.autoCollectStatus.error_message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  오류: {autoCollectData.autoCollectStatus.error_message}
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
          {autoCollectData?.autoCollectStatus.is_running ? (
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
            onClick={restartAutoCollect}
            disabled={isRestarting}
            className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-lg font-medium"
          >
            <RotateCcw className="w-6 h-6" />
            <span>{isRestarting ? '재시작 중...' : '자동수집 재시작'}</span>
          </button>
          
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

      {/* 간단한 통계 */}
      {autoCollectData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">간단 통계</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{autoCollectData.statistics.totalKeywords.toLocaleString()}</div>
              <div className="text-sm text-gray-600">전체 키워드</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{autoCollectData.statistics.availableSeeds.toLocaleString()}</div>
              <div className="text-sm text-gray-600">시드 후보</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{autoCollectData.statistics.usedSeeds.toLocaleString()}</div>
              <div className="text-sm text-gray-600">활용된 시드</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{autoCollectData.statistics.usageRate}%</div>
              <div className="text-sm text-gray-600">활용률</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
