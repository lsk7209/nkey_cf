'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, AlertCircle } from 'lucide-react'

export default function CollectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    seedKeywords: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const keywords = formData.seedKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keywords.length === 0) {
        throw new Error('최소 1개의 시드키워드를 입력해주세요.')
      }

      if (keywords.length > 20) {
        throw new Error('최대 20개의 시드키워드만 입력 가능합니다.')
      }

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          seedKeywords: keywords,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '수집 세션 생성에 실패했습니다.')
      }

      const collection = await response.json()
      router.push(`/collections/${collection.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <Search className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            키워드 수집 시작
          </h1>
          <p className="text-gray-600">
            시드키워드를 입력하여 연관키워드를 수집해보세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              수집 세션 이름 *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input-field"
              placeholder="예: 여행 키워드 분석"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input-field"
              rows={3}
              placeholder="수집 목적이나 특이사항을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="seedKeywords" className="block text-sm font-medium text-gray-700 mb-2">
              시드키워드 *
            </label>
            <textarea
              id="seedKeywords"
              value={formData.seedKeywords}
              onChange={(e) => handleInputChange('seedKeywords', e.target.value)}
              className="input-field"
              rows={4}
              placeholder="키워드를 쉼표(,)로 구분하여 입력하세요&#10;예: 강원도풀빌라, 제주도펜션, 부산호텔"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              최대 20개까지 입력 가능합니다. 각 키워드는 최대 5개의 연관키워드를 생성합니다.
            </p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  수집 시작 중...
                </>
              ) : (
                '수집 시작'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-8 card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 수집 팁</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 구체적이고 명확한 키워드를 사용하세요</li>
          <li>• 브랜드명이나 상품명을 포함하면 더 정확한 결과를 얻을 수 있습니다</li>
          <li>• 너무 일반적인 키워드는 경쟁이 치열할 수 있습니다</li>
          <li>• 수집 시간은 키워드 수에 따라 달라질 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
}
