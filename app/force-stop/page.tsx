'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default function ForceStopPage() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const forceStop = async () => {
    setIsLoading(true)
    setMessage('강제 중단 시도 중...')
    
    try {
      // 1. 자동수집 중단 API 호출
      const stopResponse = await fetch('/api/auto-collect-stop', {
        method: 'POST'
      })

      if (stopResponse.ok) {
        setMessage('✅ 자동수집 중단 API 호출 성공')
        
        // 2. 상태 확인
        setTimeout(async () => {
          try {
            const statusResponse = await fetch('/api/auto-collect-status')
            if (statusResponse.ok) {
              const data = await statusResponse.json()
              if (data.autoCollectStatus.is_running) {
                setMessage('⚠️ 자동수집이 여전히 실행 중입니다. 데이터베이스에서 직접 중단해야 할 수 있습니다.')
              } else {
                setMessage('✅ 자동수집이 성공적으로 중단되었습니다.')
              }
            }
          } catch (error) {
            setMessage('❌ 상태 확인 중 오류가 발생했습니다.')
          }
        }, 2000)
        
      } else {
        const errorData = await stopResponse.json()
        setMessage(`❌ 자동수집 중단 실패: ${errorData.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      setMessage('❌ 강제 중단 중 오류가 발생했습니다.')
      console.error('강제 중단 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkStatus = async () => {
    setIsLoading(true)
    setMessage('상태 확인 중...')
    
    try {
      const response = await fetch('/api/auto-collect-status')
      if (response.ok) {
        const data = await response.json()
        setMessage(`현재 상태: ${data.autoCollectStatus.is_running ? '실행 중' : '대기 중'} - ${data.autoCollectStatus.status_message}`)
      } else {
        setMessage('❌ 상태 확인 실패')
      }
    } catch (error) {
      setMessage('❌ 상태 확인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 mr-3 text-red-600" />
          강제 중단 도구
        </h1>
        <p className="text-lg text-gray-600">
          자동수집이 멈추지 않을 때 사용하는 긴급 도구
        </p>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
          message.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
          message.includes('⚠️') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* 강제 중단 버튼 */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">긴급 조치</h2>
        
        <div className="space-y-4">
          <button
            onClick={forceStop}
            disabled={isLoading}
            className="w-full px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-medium"
          >
            <XCircle className="w-6 h-6" />
            <span>{isLoading ? '처리 중...' : '자동수집 강제 중단'}</span>
          </button>
          
          <button
            onClick={checkStatus}
            disabled={isLoading}
            className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-medium"
          >
            <CheckCircle className="w-6 h-6" />
            <span>{isLoading ? '확인 중...' : '현재 상태 확인'}</span>
          </button>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">⚠️ 주의사항</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 이 도구는 자동수집이 정상적으로 중단되지 않을 때만 사용하세요</li>
          <li>• 강제 중단 후에는 자동수집2 페이지에서 상태를 확인하세요</li>
          <li>• 문제가 지속되면 데이터베이스에서 직접 수정이 필요할 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
}
