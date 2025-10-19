'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, RefreshCw, Settings, Target, BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface AutoCollectSettings {
  enabled: boolean
  targetCount: number
}

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

export default function AutoCollectPage() {
  const [settings, setSettings] = useState<AutoCollectSettings>({
    enabled: true,
    targetCount: 1000
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [autoCollectData, setAutoCollectData] = useState<AutoCollectData | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  // 설정 로드
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('autoCollectSettings')
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings))
        }
      } catch (error) {
        console.error('설정 로드 실패:', error)
      }
    }
    loadSettings()
    fetchAutoCollectStatus()
  }, [])

  // 자동수집이 실행 중일 때 5초마다 상태 새로고침
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (autoCollectData?.autoCollectStatus.is_running) {
      interval = setInterval(() => {
        fetchAutoCollectStatus()
      }, 5000) // 5초마다 새로고침
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
        body: JSON.stringify({ targetCount: settings.targetCount }),
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
    if (!settings.enabled) {
      setMessage('❌ 자동수집이 비활성화되어 있습니다.')
      return
    }

    setIsStarting(true)
    setMessage('자동수집 시작 중...')

    try {
      const response = await fetch('/api/auto-collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetCount: settings.targetCount }),
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

  // 설정 저장
  const saveSettings = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      localStorage.setItem('autoCollectSettings', JSON.stringify(settings))
      setMessage('✅ 설정이 저장되었습니다.')
    } catch (error) {
      setMessage('❌ 설정 저장에 실패했습니다.')
      console.error('설정 저장 실패:', error)
    } finally {
      setIsLoading(false)
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
          자동수집 관리
        </h1>
        <p className="text-lg text-gray-600">
          기존 키워드를 활용하여 자동으로 대량의 키워드를 수집합니다
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
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-gray-600" />
          자동수집 설정
        </h2>

        <div className="space-y-6">
          {/* 자동수집 활성화 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-medium text-gray-900">자동수집 활성화</h3>
              <p className="text-sm text-gray-600">기존 수집된 키워드를 시드키워드로 활용하여 자동으로 키워드를 수집합니다</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 목표 수집개수 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-gray-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">목표 수집개수</h3>
                <p className="text-sm text-gray-600">수집할 키워드의 목표 개수를 설정합니다</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={settings.targetCount}
                onChange={(e) => setSettings(prev => ({ ...prev, targetCount: parseInt(e.target.value) || 1000 }))}
                min="100"
                max="10000"
                className="w-24 px-3 py-2 border border-gray-300 rounded-md text-center"
              />
              <span className="text-sm text-gray-600">개</span>
            </div>
          </div>

          {/* 설정 저장 버튼 */}
          <div className="flex justify-center">
            <button
              onClick={saveSettings}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Settings className="w-5 h-5" />
              <span>{isLoading ? '저장 중...' : '설정 저장'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 자동수집 실행 섹션 */}
      {settings.enabled && (
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Play className="w-6 h-6 mr-2 text-green-600" />
            자동수집 실행
          </h2>

          <div className="space-y-6">
            {/* 통계 정보 */}
            {autoCollectData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{autoCollectData.statistics.totalKeywords.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">전체 키워드</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{autoCollectData.statistics.availableSeeds.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">시드키워드 후보</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{autoCollectData.statistics.usedSeeds.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">활용된 시드</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{autoCollectData.statistics.usageRate}%</div>
                    <div className="text-sm text-gray-600">활용률</div>
                  </div>
                </div>

                {/* 자동수집 실행 상태 */}
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-blue-900 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      자동수집 상태
                    </h4>
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
                  
                  <p className="text-sm text-blue-800 mb-4">
                    {autoCollectData.autoCollectStatus.status_message}
                  </p>
                  
                  {autoCollectData.autoCollectStatus.is_running && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>진행률: {autoCollectData.autoCollectStatus.current_count} / {autoCollectData.autoCollectStatus.target_count}</span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {getRunningTime()}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage()}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-blue-700">
                        <span>{autoCollectData.autoCollectStatus.seeds_used}개 시드 활용</span>
                        <span>{getProgressPercentage().toFixed(1)}% 완료</span>
                      </div>
                    </div>
                  )}
                  
                  {autoCollectData.autoCollectStatus.error_message && (
                    <p className="text-sm text-red-600 mt-3 p-2 bg-red-50 rounded">
                      오류: {autoCollectData.autoCollectStatus.error_message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* 자동수집 제어 버튼 */}
            <div className="flex justify-center space-x-4">
              {autoCollectData?.autoCollectStatus.is_running ? (
                <button
                  onClick={stopAutoCollect}
                  disabled={isStopping}
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Pause className="w-5 h-5" />
                  <span>{isStopping ? '중단 중...' : '자동수집 중단'}</span>
                </button>
              ) : (
                <button
                  onClick={startAutoCollect}
                  disabled={!settings.enabled || isStarting}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>{isStarting ? '시작 중...' : '자동수집 시작'}</span>
                </button>
              )}
              
              <button
                onClick={restartAutoCollect}
                disabled={!settings.enabled || isRestarting}
                className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{isRestarting ? '재시작 중...' : '자동수집 재시작'}</span>
              </button>
              
              <button
                onClick={fetchAutoCollectStatus}
                disabled={isLoadingStatus}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <RefreshCw className={`w-5 h-5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                <span>{isLoadingStatus ? '새로고침 중...' : '상태 새로고침'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 자동수집 동작 방식 안내 */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-gray-600" />
          자동수집 동작 방식
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
            <p className="text-gray-700">기존에 수집된 키워드 중 시드로 활용되지 않은 키워드를 시드키워드로 사용합니다.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <p className="text-gray-700">각 키워드는 한 번만 시드키워드로 활용되며, 활용 후에는 자동으로 다음 키워드로 이동합니다.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <p className="text-gray-700">목표 수집 개수에 도달하면 자동수집이 중단됩니다.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
            <p className="text-gray-700">실시간 배치 저장으로 중간에 중단되어도 데이터가 보존됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
