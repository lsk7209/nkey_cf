'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Database, Trash2, Eye, Calendar, Hash } from 'lucide-react'

interface Collection {
  id: string
  name: string
  description?: string
  seed_keywords: string[]
  status: 'pending' | 'collecting' | 'completed' | 'failed'
  total_keywords: number
  created_at: string
  updated_at: string
  completed_at?: string
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections')
      if (!response.ok) {
        throw new Error('수집 세션 목록을 불러오는데 실패했습니다.')
      }
      const data = await response.json()
      setCollections(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (collectionId: string) => {
    if (!confirm('정말로 이 수집 세션을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('수집 세션 삭제에 실패했습니다.')
      }

      setCollections(collections.filter(c => c.id !== collectionId))
    } catch (err) {
      alert(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status: Collection['status']) => {
    const statusMap = {
      pending: { label: '대기중', className: 'status-pending' },
      collecting: { label: '수집중', className: 'status-collecting' },
      completed: { label: '완료', className: 'status-completed' },
      failed: { label: '실패', className: 'status-failed' },
    }

    const statusInfo = statusMap[status]
    return (
      <span className={`status-badge ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">수집 세션 목록</h1>
          <p className="text-gray-600">키워드 수집 세션을 관리하세요</p>
        </div>
        <Link href="/collect" className="btn-primary">
          새 수집 시작
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="card p-12 text-center">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            수집 세션이 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            첫 번째 키워드 수집을 시작해보세요
          </p>
          <Link href="/collect" className="btn-primary">
            키워드 수집 시작
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {collections.map((collection) => (
            <div key={collection.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {collection.name}
                    </h3>
                    {getStatusBadge(collection.status)}
                  </div>
                  {collection.description && (
                    <p className="text-gray-600 mb-3">{collection.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/collections/${collection.id}`}
                    className="btn-secondary text-sm"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    보기
                  </Link>
                  <button
                    onClick={() => handleDelete(collection.id)}
                    className="btn-danger text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Hash className="w-4 h-4 mr-2" />
                  <span>키워드: {collection.total_keywords}개</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>생성: {formatDate(collection.created_at)}</span>
                </div>
                {collection.completed_at && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>완료: {formatDate(collection.completed_at)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">시드키워드:</p>
                <div className="flex flex-wrap gap-2">
                  {collection.seed_keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
