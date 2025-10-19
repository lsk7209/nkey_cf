'use client'

import { useState, useEffect } from 'react'
import { Settings, ToggleLeft, ToggleRight, Target, Save, Play, Pause, BarChart3 } from 'lucide-react'

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<AutoCollectSettings>({
    enabled: false,
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
      }
    } catch (error) {
      console.error('자동수집 상태 조회 실패:', error)
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
      setMessage('설정이 저장되었습니다.')
      
      // 3초 후 메시지 제거
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('설정 저장에 실패했습니다.')
      console.error('설정 저장 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }))
  }

  const handleTargetCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0
    setSettings(prev => ({ ...prev, targetCount: value }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Settings className="w-8 h-8 mr-3 text-blue-600" />
          환경설정
        </h1>
        <p className="text-lg text-gray-600">
          자동수집 기능과 관련된 설정을 관리합니다
        </p>
      </div>

      {/* 자동수집 설정 */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <Target className="w-6 h-6 mr-2 text-green-600" />
          자동수집 설정
        </h2>

        <div className="space-y-6">
          {/* 자동수집 ON/OFF */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-medium text-gray-900">자동수집 활성화</h3>
              <p className="text-sm text-gray-600 mt-1">
                기존 수집된 키워드를 시드키워드로 활용하여 자동으로 키워드를 수집합니다
              </p>
            </div>
            <button
              onClick={handleToggle}
              className="flex items-center space-x-2"
            >
              {settings.enabled ? (
                <ToggleRight className="w-12 h-6 text-green-600" />
              ) : (
                <ToggleLeft className="w-12 h-6 text-gray-400" />
              )}
            </button>
          </div>

          {/* 목표 수집개수 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">목표 수집개수</h3>
            <p className="text-sm text-gray-600 mb-4">
              자동수집으로 수집할 총 키워드 개수를 설정합니다
            </p>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={settings.targetCount}
                onChange={handleTargetCountChange}
                min="100"
                max="10000"
                step="100"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!settings.enabled}
              />
              <span className="text-sm text-gray-600">개</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              최소 100개, 최대 10,000개까지 설정 가능합니다
            </p>
          </div>

          {/* 자동수집 설명 */}
          {settings.enabled && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">자동수집 동작 방식</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 기존에 수집된 키워드 중 시드활용되지 않은 키워드를 시드키워드로 활용</li>
                <li>• 각 키워드는 1회만 시드키워드로 활용되며, 활용 후에는 자동으로 다음 키워드로 이동</li>
                <li>• 목표 수집개수에 도달하면 자동수집이 중단됩니다</li>
                <li>• 실시간 배치 저장으로 중간에 중단되어도 데이터가 보존됩니다</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 자동수집 실행 */}
      {settings.enabled && (
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Play className="w-6 h-6 mr-2 text-green-600" />
            자동수집 실행
          </h2>

          <div className="space-y-6">
            {/* 자동수집 상태 */}
            {autoCollectData && (
              <>
                {/* 통계 정보 */}
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
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-900">자동수집 상태</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      autoCollectData.autoCollectStatus.is_running 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {autoCollectData.autoCollectStatus.is_running ? '실행 중' : '대기 중'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-800 mb-2">
                    {autoCollectData.autoCollectStatus.status_message}
                  </p>
                  {autoCollectData.autoCollectStatus.is_running && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>진행률: {autoCollectData.autoCollectStatus.current_count} / {autoCollectData.autoCollectStatus.target_count}</span>
                        <span>{autoCollectData.autoCollectStatus.seeds_used}개 시드 활용</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${autoCollectData.autoCollectStatus.target_count > 0 ? (autoCollectData.autoCollectStatus.current_count / autoCollectData.autoCollectStatus.target_count) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {autoCollectData.autoCollectStatus.error_message && (
                    <p className="text-sm text-red-600 mt-2">
                      오류: {autoCollectData.autoCollectStatus.error_message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* 자동수집 실행/중단/재시작 버튼 */}
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
                <Play className="w-5 h-5" />
                <span>{isRestarting ? '재시작 중...' : '자동수집 재시작'}</span>
              </button>
              
              <button
                onClick={fetchAutoCollectStatus}
                disabled={isLoadingStatus}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <BarChart3 className="w-5 h-5" />
                <span>{isLoadingStatus ? '새로고침 중...' : '상태 새로고침'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="flex justify-center">
        <button
          onClick={saveSettings}
          disabled={isLoading}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>{isLoading ? '저장 중...' : '설정 저장'}</span>
        </button>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`text-center p-4 rounded-lg ${
          message.includes('실패') 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
